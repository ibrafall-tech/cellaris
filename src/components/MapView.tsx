import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useShallow } from 'zustand/react/shallow';
import { useApp, useResults, type BaseLayer, type Site } from '../store/store';
import { num } from '../lib/format';
import { Icon } from './Icon';
import { IconButton, Segmented, cx, toast } from './ui';

const TILES: Record<BaseLayer, { url: string; attr: string; dark: boolean }> = {
  osm: { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', dark: true },
  topo: { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> · <a href="https://opentopomap.org">OpenTopoMap</a>', dark: true },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Imagerie &copy; Esri', dark: false },
};

const pinIcon = (on: boolean, fresh = false) =>
  L.divIcon({
    className: '',
    html: `<div class="site-pin ${on ? '' : 'off'} ${fresh ? 'fresh' : ''}"><div class="core"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4.9 19.1a10 10 0 0 1 0-14.2M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M19.1 4.9a10 10 0 0 1 0 14.2"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg></div></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });

/** Point à distance d (km) et cap θ (deg) d'une origine. */
function offset(lat: number, lng: number, dKm: number, bearing: number): [number, number] {
  const b = (bearing * Math.PI) / 180;
  const dLat = (dKm * Math.cos(b)) / 110.574;
  const dLng = (dKm * Math.sin(b)) / (111.32 * Math.cos((lat * Math.PI) / 180));
  return [lat + dLat, lng + dLng];
}

function sectorPolygon(s: Site, rKm: number, az: number, width: number) {
  const pts: [number, number][] = [[s.lat, s.lng]];
  for (let a = az - width / 2; a <= az + width / 2 + 0.01; a += width / 14) pts.push(offset(s.lat, s.lng, rKm, a));
  return pts;
}

export default function MapView() {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const zoneLayer = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const fresh = useRef<string | null>(null);
  const [placing, setPlacing] = useState(true);
  const [panel, setPanel] = useState(() => matchMedia('(min-width: 768px)').matches);
  const placingRef = useRef(placing);
  placingRef.current = placing;

  const r = useResults();
  const s = useApp(useShallow((st) => ({
    sites: st.sites, baseLayer: st.baseLayer, showCoverage: st.showCoverage, showSectors: st.showSectors,
    mapCenter: st.mapCenter, params: st.params,
  })));
  const act = useApp(useShallow((st) => ({
    addSite: st.addSite, addSites: st.addSites, updateSite: st.updateSite, removeSite: st.removeSite, clearSites: st.clearSites,
    restoreSites: st.restoreSites, setBaseLayer: st.setBaseLayer, toggleCoverage: st.toggleCoverage, toggleSectors: st.toggleSectors,
  })));

  /* Initialisation */
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { center: s.mapCenter, zoom: 12, zoomControl: false, preferCanvas: true, attributionControl: true });
    m.attributionControl.setPrefix('');
    layer.current = L.layerGroup().addTo(m);
    zoneLayer.current = L.layerGroup().addTo(m);
    m.on('click', (e: L.LeafletMouseEvent) => {
      if (!placingRef.current) return;
      const site = useApp.getState().addSite(e.latlng.lat, e.latlng.lng);
      fresh.current = site.id;
    });
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; markers.current.clear(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Fond de carte */
  useEffect(() => {
    const m = map.current; if (!m) return;
    tiles.current?.remove();
    const t = TILES[s.baseLayer];
    tiles.current = L.tileLayer(t.url, { attribution: t.attr, maxZoom: s.baseLayer === 'topo' ? 17 : 19, subdomains: 'abc' }).addTo(m);
    tiles.current.bringToBack();
    el.current?.classList.toggle('raw-tiles', !t.dark);
  }, [s.baseLayer]);

  useEffect(() => {
    if (el.current) el.current.style.cursor = placing ? 'crosshair' : '';
  }, [placing]);

  /* Marqueurs (diff incrémental) */
  useEffect(() => {
    const m = map.current; if (!m) return;
    const ids = new Set(s.sites.map((x) => x.id));
    markers.current.forEach((mk, id) => { if (!ids.has(id)) { mk.remove(); markers.current.delete(id); } });
    s.sites.forEach((site) => {
      let mk = markers.current.get(site.id);
      if (!mk) {
        mk = L.marker([site.lat, site.lng], { icon: pinIcon(site.enabled, fresh.current === site.id), draggable: true, keyboard: true, title: site.name }).addTo(m);
        mk.on('dragend', () => { const ll = mk!.getLatLng(); useApp.getState().updateSite(site.id, { lat: ll.lat, lng: ll.lng }); });
        mk.on('click', (e) => L.DomEvent.stopPropagation(e));
        markers.current.set(site.id, mk);
      } else {
        const ll = mk.getLatLng();
        if (ll.lat !== site.lat || ll.lng !== site.lng) mk.setLatLng([site.lat, site.lng]);
        mk.setIcon(pinIcon(site.enabled));
      }
      mk.bindPopup(
        `<div style="min-width:170px;font-size:12px"><div style="font-weight:600;font-size:13px;margin-bottom:6px">${site.name}</div>` +
        `<div style="display:flex;justify-content:space-between;color:var(--muted)">Coordonnées<span style="color:var(--ink);font-family:var(--font-mono)">${site.lat.toFixed(4)}, ${site.lng.toFixed(4)}</span></div>` +
        `<div style="display:flex;justify-content:space-between;color:var(--muted)">Rayon<span style="color:var(--ink);font-family:var(--font-mono)">${num(r.propagation.cellRadius, 2)} km</span></div>` +
        `<div style="display:flex;justify-content:space-between;color:var(--muted)">Azimut<span style="color:var(--ink);font-family:var(--font-mono)">${site.azimuth}°</span></div></div>`,
      );
    });
    fresh.current = null;
  }, [s.sites, r.propagation.cellRadius]);

  /* Couverture et secteurs */
  useEffect(() => {
    const g = layer.current; if (!g) return;
    g.clearLayers();
    if (!s.showCoverage) return;
    const R = r.propagation.cellRadius;
    const sectors = s.params.enodeb.sectors;
    const colors = ['#4DF0C0', '#8C99FF', '#FFB547', '#FF5C7A', '#5BD1FF', '#C08CFF'];
    s.sites.forEach((site) => {
      if (!site.enabled) return;
      if (s.showSectors && sectors > 1) {
        const w = 360 / sectors;
        for (let k = 0; k < sectors; k++) {
          const c = colors[k % colors.length];
          L.polygon(sectorPolygon(site, R, site.azimuth + k * w, w * 0.96), {
            color: c, weight: 1, opacity: 0.8, fillColor: c, fillOpacity: 0.13, interactive: false,
          }).addTo(g);
        }
      } else {
        L.circle([site.lat, site.lng], { radius: R * 1000, color: '#4DF0C0', weight: 1.2, fillColor: '#4DF0C0', fillOpacity: 0.12, interactive: false }).addTo(g);
      }
    });
  }, [s.sites, s.showCoverage, s.showSectors, s.params.enodeb.sectors, r.propagation.cellRadius]);

  const placedArea = useMemo(() => s.sites.filter((x) => x.enabled).length * r.coverage.siteArea, [s.sites, r.coverage.siteArea]);
  const enabled = s.sites.filter((x) => x.enabled).length;
  const progress = Math.min(100, (enabled / Math.max(1, r.finalSites)) * 100);

  const autoPlan = () => {
    const m = map.current; if (!m) return;
    const c = m.getCenter();
    const zoneR = Math.sqrt(s.params.zone.surface / Math.PI);
    const d = Math.sqrt((2 * r.coverage.siteArea) / Math.sqrt(3));
    const target = Math.min(r.coverage.sitesRequired, 400);
    const pts: { lat: number; lng: number; dist: number }[] = [];
    const n = Math.ceil(zoneR / d) + 2;
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        const x = d * (i + (j % 2 ? 0.5 : 0));
        const y = d * j * (Math.sqrt(3) / 2);
        const dist = Math.hypot(x, y);
        if (dist <= zoneR + d * 0.5) {
          const [lat, lng] = offset(c.lat, c.lng, dist, (Math.atan2(x, y) * 180) / Math.PI);
          pts.push({ lat, lng, dist });
        }
      }
    }
    pts.sort((a, b) => a.dist - b.dist);
    const prev = s.sites;
    act.clearSites();
    act.addSites(pts.slice(0, target));
    const zl = zoneLayer.current!;
    zl.clearLayers();
    L.circle(c, { radius: zoneR * 1000, color: '#8C99FF', weight: 1.5, dashArray: '6 6', fill: false, interactive: false }).addTo(zl);
    const wide = (el.current?.clientWidth ?? 0) > 720;
    m.flyToBounds(L.latLng(c).toBounds(zoneR * 2100), {
      duration: 0.8, paddingTopLeft: [64, 64], paddingBottomRight: [wide ? 340 : 16, wide ? 16 : 120],
    });
    setPlacing(false);
    toast(`${Math.min(target, pts.length)} sites placés en maillage hexagonal`, { label: 'Annuler', run: () => { act.restoreSites(prev); zl.clearLayers(); } });
  };

  const clearAll = () => {
    const prev = s.sites;
    act.clearSites();
    zoneLayer.current?.clearLayers();
    toast('Sites supprimés', { label: 'Annuler', run: () => act.restoreSites(prev) });
  };

  const locate = () => {
    if (!navigator.geolocation) return toast('Géolocalisation indisponible');
    navigator.geolocation.getCurrentPosition(
      (pos) => map.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 14, { duration: 0.8 }),
      () => toast('Position non autorisée'),
    );
  };

  return (
    <div className="relative h-full min-h-[480px] overflow-hidden rounded-3xl border border-line bg-surface-2 shadow-card">
      <div ref={el} className="absolute inset-0 z-0" />

      {/* Barre d'outils */}
      <div className="absolute top-3 left-3 z-[500] flex flex-col gap-2">
        <div className="flex flex-col rounded-2xl border border-line bg-surface/90 p-1 shadow-card backdrop-blur-md">
          <IconButton icon="plus" label="Zoom avant" onClick={() => map.current?.zoomIn()} />
          <IconButton icon="minus" label="Zoom arrière" onClick={() => map.current?.zoomOut()} />
        </div>
        <div className="flex flex-col rounded-2xl border border-line bg-surface/90 p-1 shadow-card backdrop-blur-md">
          <IconButton icon="pin" label={placing ? 'Placement actif (clic sur la carte)' : 'Activer le placement'} active={placing} onClick={() => setPlacing((v) => !v)} />
          <IconButton icon="eye" label={s.showCoverage ? 'Masquer la couverture' : 'Afficher la couverture'} active={s.showCoverage} onClick={act.toggleCoverage} />
          <IconButton icon="spark" label={s.showSectors ? 'Couverture circulaire' : 'Afficher les secteurs'} active={s.showSectors} onClick={act.toggleSectors} />
          <IconButton icon="locate" label="Ma position" onClick={locate} />
          <IconButton icon="target" label="Recentrer sur Dakar" onClick={() => map.current?.flyTo(s.mapCenter, 12, { duration: 0.8 })} />
        </div>
      </div>

      {/* Fond de carte */}
      <div className="absolute top-3 left-1/2 z-[500] w-[min(300px,calc(100%-120px))] -translate-x-1/2 rounded-2xl border border-line bg-surface/90 p-1 shadow-card backdrop-blur-md max-sm:left-auto max-sm:right-3 max-sm:translate-x-0">
        <Segmented size="sm" label="Fond de carte" value={s.baseLayer} onChange={act.setBaseLayer}
          options={[{ value: 'osm', label: 'Plan' }, { value: 'topo', label: 'Relief' }, { value: 'satellite', label: 'Satellite' }]} />
      </div>

      {placing && s.sites.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[400] flex justify-center">
          <div className="rise flex items-center gap-2 rounded-full border border-line bg-surface/95 px-4 py-2 text-[13px] font-medium text-ink-2 shadow-card backdrop-blur">
            <Icon name="pin" size={15} className="text-signal" /> Cliquez sur la carte pour placer un eNodeB
          </div>
        </div>
      )}

      {/* Panneau des sites */}
      <div className={cx('absolute right-3 bottom-3 z-[500] flex w-[min(320px,calc(100%-24px))] flex-col overflow-hidden rounded-2xl border border-line bg-surface/95 shadow-card backdrop-blur-md transition-all',
        panel ? 'max-h-[min(460px,55%)] md:max-h-[min(460px,calc(100%-80px))]' : 'max-h-[64px]')}>
        <button className="flex items-center gap-3 px-4 py-3 text-left" onClick={() => setPanel((v) => !v)} aria-expanded={panel}>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="tnum font-display text-[20px] font-semibold text-ink">{enabled}</span>
              <span className="tnum text-[12.5px] text-muted">/ {num(r.finalSites)} sites requis</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-signal transition-[width] duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <Icon name="chevron" size={16} className={cx('text-muted transition-transform', !panel && 'rotate-180')} />
        </button>
        {panel && (
          <>
            <div className="grid grid-cols-2 gap-2 px-4 pb-3">
              <button onClick={autoPlan} className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-signal text-[12.5px] font-semibold text-bg transition hover:brightness-110 active:scale-[.98]">
                <Icon name="wand" size={15} /> Auto-planifier
              </button>
              <button onClick={clearAll} disabled={!s.sites.length} className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-surface-2 text-[12.5px] font-semibold text-ink-2 transition hover:text-rose disabled:opacity-40">
                <Icon name="trash" size={15} /> Tout effacer
              </button>
            </div>
            <div className="tnum flex justify-between border-t border-line px-4 py-2 font-mono text-[11.5px] text-muted">
              <span>Couvert ≈ {num(placedArea, 1)} km²</span>
              <span>Zone {num(s.params.zone.surface)} km²</span>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto border-t border-line px-2 py-1.5">
              {s.sites.length === 0 && <li className="px-2 py-4 text-center text-[12.5px] text-muted">Aucun site. Cliquez sur la carte ou lancez l’auto-planification.</li>}
              {s.sites.map((site) => (
                <li key={site.id} className="group flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-surface-2">
                  <button aria-label={site.enabled ? 'Désactiver' : 'Activer'} onClick={() => act.updateSite(site.id, { enabled: !site.enabled })}
                    className={cx('size-2.5 shrink-0 rounded-full ring-4 transition', site.enabled ? 'bg-signal ring-signal-soft' : 'bg-muted ring-transparent')} />
                  <input value={site.name} onChange={(e) => act.updateSite(site.id, { name: e.target.value })} aria-label="Nom du site"
                    className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-0.5 text-[13px] text-ink outline-none focus:bg-surface" />
                  <label className="tnum flex items-center gap-0.5 font-mono text-[11px] text-muted" title="Azimut">
                    <input type="number" min={0} max={359} value={site.azimuth} aria-label="Azimut"
                      onChange={(e) => act.updateSite(site.id, { azimuth: ((+e.target.value % 360) + 360) % 360 })}
                      className="w-9 rounded-md bg-transparent text-right outline-none focus:bg-surface" />°
                  </label>
                  <button aria-label="Centrer" onClick={() => map.current?.flyTo([site.lat, site.lng], 14, { duration: 0.6 })} className="text-muted opacity-0 group-hover:opacity-100 hover:text-ink focus:opacity-100"><Icon name="locate" size={14} /></button>
                  <button aria-label="Supprimer" onClick={() => act.removeSite(site.id)} className="text-muted opacity-0 group-hover:opacity-100 hover:text-rose focus:opacity-100"><Icon name="x" size={14} /></button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
