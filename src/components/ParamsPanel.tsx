import { useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useApp } from '../store/store';
import { BANDWIDTHS, ENV_LABEL, FREQUENCY_BANDS, MIMO_CONFIGS, PRESETS, SECTOR_OPTIONS } from '../engine/constants';
import type { Environment, Params } from '../engine/types';
import { ENODEB_FIELDS, RADIO_FIELDS, UE_FIELDS, ZONE_FIELDS, type NumField } from '../lib/fields';
import { compact, num } from '../lib/format';
import { Chips, ParamField, Segmented, cx, toast } from './ui';
import { Icon, type IconName } from './Icon';

function Section({ id, icon, title, summary, open, onToggle, children }: {
  id: string; icon: IconName; title: string; summary: string; open: boolean; onToggle: () => void; children: ReactNode;
}) {
  return (
    <div className={cx('rounded-2xl border transition-colors', open ? 'border-line bg-surface' : 'border-transparent')}>
      <button aria-expanded={open} aria-controls={id} onClick={onToggle}
        className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-surface-2/60">
        <span className={cx('grid size-8 place-items-center rounded-xl transition-colors', open ? 'bg-signal-soft text-signal' : 'bg-surface-2 text-muted')}>
          <Icon name={icon} size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[14px] font-semibold text-ink">{title}</span>
          <span className="tnum block truncate font-mono text-[11px] text-muted">{summary}</span>
        </span>
        <Icon name="chevron" size={16} className={cx('text-muted transition-transform duration-300', open && 'rotate-180')} />
      </button>
      <div id={id} className={cx('grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(.2,.8,.2,1)]', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="px-4 pb-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Fields({ fields, params, def }: { fields: NumField[]; params: Params; def: Params }) {
  const setters = useApp(useShallow((s) => ({ zone: s.setZone, radio: s.setRadio, enodeb: s.setEnodeb, ue: s.setUE })));
  return (
    <>
      {fields.map((f) => {
        const group = params[f.group] as unknown as Record<string, number>;
        const dgroup = def[f.group] as unknown as Record<string, number>;
        return (
          <ParamField key={f.key} label={f.label} unit={f.unit} hint={f.hint} min={f.min} max={f.max} step={f.step}
            digits={f.digits} value={group[f.key]} def={dgroup[f.key]}
            onChange={(v) => (setters[f.group] as (p: Record<string, number>) => void)({ [f.key]: v })} />
        );
      })}
    </>
  );
}

export function ParamsPanel() {
  const params = useApp((s) => s.params);
  const { setEnvironment, setRadio, setEnodeb, loadParams } = useApp(
    useShallow((s) => ({ setEnvironment: s.setEnvironment, setRadio: s.setRadio, setEnodeb: s.setEnodeb, loadParams: s.loadParams })),
  );
  const [open, setOpen] = useState<Record<string, boolean>>({ zone: true, radio: true, enodeb: false, ue: false });
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const env = params.zone.environment;
  const def = PRESETS[env];
  const { zone, radio, enodeb, ue } = params;

  const changeEnv = (e: Environment) => {
    if (e === env) return;
    const prev = params;
    setEnvironment(e);
    toast(`Préréglage ${ENV_LABEL[e].toLowerCase()} appliqué`, { label: 'Annuler', run: () => loadParams(prev) });
  };

  const modified = JSON.stringify(params) !== JSON.stringify(def);

  return (
    <div className="flex flex-col gap-3">
      <div className="px-1">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">Environnement</span>
          {modified && (
            <button onClick={() => { const prev = params; loadParams(structuredClone(def)); toast('Paramètres réinitialisés', { label: 'Annuler', run: () => loadParams(prev) }); }}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium text-muted hover:bg-surface-2 hover:text-ink">
              <Icon name="reset" size={12} /> Réinitialiser
            </button>
          )}
        </div>
        <Segmented label="Environnement" value={env} onChange={changeEnv}
          options={(['urban', 'suburban', 'rural'] as const).map((e) => ({ value: e, label: ENV_LABEL[e] }))} />
      </div>

      <div className="flex flex-col gap-1">
        <Section id="sec-zone" icon="target" title="Zone de service" open={open.zone} onToggle={() => toggle('zone')}
          summary={`${num(zone.surface)} km² · ${compact(zone.population)} hab. · ${zone.penetrationRate} %`}>
          <Fields fields={ZONE_FIELDS} params={params} def={def} />
        </Section>

        <Section id="sec-radio" icon="radio" title="Interface radio" open={open.radio} onToggle={() => toggle('radio')}
          summary={`${radio.frequencyBand} MHz · ${num(radio.bandwidth, radio.bandwidth % 1 ? 1 : 0)} MHz · ${radio.duplexMode} · ${radio.txPower} dBm`}>
          <Chips label="Bande de fréquence" hint="Fréquence porteuse utilisée par COST-231 Hata" value={radio.frequencyBand}
            options={FREQUENCY_BANDS} onChange={(v) => setRadio({ frequencyBand: v })} format={(v) => `${v}`} />
          <Chips label="Largeur de bande (MHz)" hint="Détermine le nombre de PRB disponibles" value={radio.bandwidth}
            options={BANDWIDTHS} onChange={(v) => setRadio({ bandwidth: v })} format={(v) => num(v, v % 1 ? 1 : 0)} />
          <div className="py-2">
            <div className="mb-2 text-[13px] text-ink-2">Mode duplex</div>
            <Segmented size="sm" label="Mode duplex" value={radio.duplexMode} onChange={(v) => setRadio({ duplexMode: v })}
              options={[{ value: 'FDD', label: 'FDD' }, { value: 'TDD', label: 'TDD' }]} />
          </div>
          <Fields fields={RADIO_FIELDS} params={params} def={def} />
        </Section>

        <Section id="sec-enb" icon="tower" title="eNodeB" open={open.enodeb} onToggle={() => toggle('enodeb')}
          summary={`${enodeb.antennaHeight} m · ${enodeb.sectors} sect. · MIMO ${enodeb.mimoConfig}`}>
          <Chips label="Secteurs par site" value={enodeb.sectors} options={SECTOR_OPTIONS} onChange={(v) => setEnodeb({ sectors: v })}
            format={(v) => (v === 1 ? '1 · omni' : `${v} secteurs`)} />
          <Chips label="Configuration MIMO" hint="Efficacité spectrale : 2×2 = 2,4 · 4×4 = 4,2 · 8×8 = 6 bit/s/Hz" value={enodeb.mimoConfig}
            options={MIMO_CONFIGS} onChange={(v) => setEnodeb({ mimoConfig: v })} format={(v) => v.replace('x', '×')} />
          <Fields fields={ENODEB_FIELDS} params={params} def={def} />
        </Section>

        <Section id="sec-ue" icon="phone" title="Terminal & trafic" open={open.ue} onToggle={() => toggle('ue')}
          summary={`${ue.sensitivity} dBm · ${ue.trafficPerUser} Mo/h · ${ue.targetThroughput} Mbps`}>
          <Fields fields={UE_FIELDS} params={params} def={def} />
        </Section>
      </div>
    </div>
  );
}
