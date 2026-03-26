"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, Route, Trash2 } from "lucide-react";
import type { DivIcon, LayerGroup, Map as LeafletMap } from "leaflet";

import type { BusinessLead, LeadOrigin } from "@/lib/lead-types";

interface LeadMapPanelProps {
  origin: LeadOrigin;
  leads: BusinessLead[];
  selectedLeadId: string | null;
  onSelectLead: (lead: BusinessLead) => void;
}

function haversineMiles(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const deltaLat = toRadians(latitudeB - latitudeA);
  const deltaLng = toRadians(longitudeB - longitudeA);
  const latA = toRadians(latitudeA);
  const latB = toRadians(latitudeB);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
}

function buildNearestRoute(leads: BusinessLead[], origin: LeadOrigin) {
  const remaining = [...leads];
  const route: BusinessLead[] = [];
  let current = origin;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const lead = remaining[index];
      const distance = haversineMiles(current.latitude, current.longitude, lead.latitude, lead.longitude);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }

    const [nextLead] = remaining.splice(bestIndex, 1);
    route.push(nextLead);
    current = { latitude: nextLead.latitude, longitude: nextLead.longitude };
  }

  return route;
}

function openDirectionsUrl(origin: LeadOrigin, lead: BusinessLead) {
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origin.latitude},${origin.longitude};${lead.latitude},${lead.longitude}`;
}

function buildRouteUrl(origin: LeadOrigin, route: BusinessLead[]) {
  if (route.length === 0) return null;

  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${[
    `${origin.latitude},${origin.longitude}`,
    ...route.slice(0, 8).map((lead) => `${lead.latitude},${lead.longitude}`),
  ].join(";")}`;
}

function buildMarkerIcon(leaflet: typeof import("leaflet"), index: number, selected: boolean): DivIcon {
  return leaflet.divIcon({
    className: "",
    html: `
      <span class="lead-map-marker-chip ${selected ? "is-selected" : ""}">
        <span class="lead-map-marker-index">${index + 1}</span>
        <span class="lead-map-marker-glyph">⌖</span>
      </span>
    `,
    iconSize: [58, 36],
    iconAnchor: [29, 18],
  });
}

function buildOriginIcon(leaflet: typeof import("leaflet")): DivIcon {
  return leaflet.divIcon({
    className: "",
    html: `
      <span class="lead-map-origin-chip">
        <span class="lead-map-origin-glyph">⌖</span>
        <span>Origin</span>
      </span>
    `,
    iconSize: [92, 36],
    iconAnchor: [46, 18],
  });
}

function toLatLngTuple(point: { latitude: number; longitude: number }) {
  return [point.latitude, point.longitude] as [number, number];
}

export function LeadMapPanel({ origin, leads, selectedLeadId, onSelectLead }: LeadMapPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerGroupRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const onSelectLeadRef = useRef(onSelectLead);
  const fitSignatureRef = useRef<string | null>(null);

  const defaultRoute = useMemo(() => buildNearestRoute(leads.slice(0, 24), origin), [leads, origin]);
  const defaultRouteIds = useMemo(() => defaultRoute.map((lead) => lead.id), [defaultRoute]);
  const displayLeads = useMemo(() => leads.slice(0, 100), [leads]);
  const leadById = useMemo(() => new Map(displayLeads.map((lead) => [lead.id, lead])), [displayLeads]);
  const dataSignature = useMemo(
    () =>
      [
        `${origin.latitude.toFixed(6)},${origin.longitude.toFixed(6)}`,
        ...displayLeads
          .map((lead) => `${lead.id}:${lead.latitude.toFixed(6)}:${lead.longitude.toFixed(6)}`)
          .sort(),
      ].join("|"),
    [displayLeads, origin.latitude, origin.longitude],
  );

  const [plannedRouteIds, setPlannedRouteIds] = useState<string[]>(defaultRouteIds);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const defaultRouteIdsRef = useRef<string[]>(defaultRouteIds);
  const originCenter = useMemo(
    () => [origin.latitude, origin.longitude] as [number, number],
    [origin.latitude, origin.longitude],
  );

  const plannedRoute = useMemo(
    () => plannedRouteIds.map((id) => leadById.get(id)).filter((lead): lead is BusinessLead => Boolean(lead)),
    [leadById, plannedRouteIds],
  );
  const plannedRouteUrl = useMemo(() => buildRouteUrl(origin, plannedRoute), [origin, plannedRoute]);
  const isRouteCustomized =
    plannedRouteIds.length !== defaultRouteIds.length ||
    plannedRouteIds.some((id, index) => defaultRouteIds[index] !== id);

  useEffect(() => {
    onSelectLeadRef.current = onSelectLead;
  }, [onSelectLead]);

  useEffect(() => {
    defaultRouteIdsRef.current = defaultRouteIds;
  }, [defaultRouteIds]);

  useEffect(() => {
    setPlannedRouteIds(defaultRouteIdsRef.current);
    setDraggingLeadId(null);
    setDropTargetId(null);
  }, [dataSignature]);

  useEffect(() => {
    if (!isExpanded || !mapContainerRef.current) {
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      const leaflet = await import("leaflet");
      if (cancelled || !mapContainerRef.current) {
        return;
      }

      leafletRef.current = leaflet;

      const map = leaflet.map(mapContainerRef.current, {
        center: originCenter,
        zoom: 11,
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        dragging: true,
        preferCanvas: true,
      });
      mapRef.current = map;
      map.setView(originCenter, 11);

      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
          maxZoom: 19,
          detectRetina: true,
        })
        .addTo(map);

      layerGroupRef.current = leaflet.layerGroup().addTo(map);

      requestAnimationFrame(() => {
        map.invalidateSize();
      });
    };

    void bootstrap();

    return () => {
      cancelled = true;
      layerGroupRef.current?.clearLayers();
      layerGroupRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      fitSignatureRef.current = null;
    };
  }, [isExpanded, originCenter]);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    const layers = layerGroupRef.current;

    if (!isExpanded || !map || !leaflet || !layers) {
      return;
    }

    layers.clearLayers();

    const nextFitSignature = [
      `${origin.latitude.toFixed(6)},${origin.longitude.toFixed(6)}`,
      ...displayLeads
        .map((lead) => `${lead.id}:${lead.latitude.toFixed(6)}:${lead.longitude.toFixed(6)}`)
        .sort(),
    ].join("|");
    const shouldFitBounds = fitSignatureRef.current !== nextFitSignature;
    fitSignatureRef.current = nextFitSignature;

    leaflet
      .marker(toLatLngTuple(origin), {
        icon: buildOriginIcon(leaflet),
        interactive: false,
      })
      .addTo(layers);

    const routePoints = plannedRoute.slice(0, 24);
    if (routePoints.length > 1) {
      leaflet
        .polyline([toLatLngTuple(origin), ...routePoints.map((lead) => toLatLngTuple(lead))], {
          color: "#9bc3ff",
          weight: 4,
          opacity: 0.85,
          lineJoin: "round",
          lineCap: "round",
        })
        .addTo(layers);
    }

    displayLeads.forEach((lead, index) => {
      const marker = leaflet.marker([lead.latitude, lead.longitude], {
        icon: buildMarkerIcon(leaflet, index, lead.id === selectedLeadId),
        riseOnHover: true,
      });

      marker.bindTooltip(`${lead.name} · ${lead.distanceMiles.toFixed(1)} mi`, {
        direction: "top",
        offset: [0, -10],
        opacity: 1,
        className: "lead-map-tooltip",
      });

      marker.on("click", () => {
        onSelectLeadRef.current(lead);
      });

      marker.addTo(layers);
    });

    if (shouldFitBounds) {
      const points = [origin, ...displayLeads];
      if (points.length > 1) {
        const bounds = leaflet.latLngBounds(points.map((point) => toLatLngTuple(point)));
        map.fitBounds(bounds.pad(0.18), { animate: false, maxZoom: 16 });
      } else {
        map.setView(toLatLngTuple(origin), 13);
      }
    }

    requestAnimationFrame(() => {
      map.invalidateSize();
    });
  }, [displayLeads, isExpanded, origin, plannedRoute, selectedLeadId]);

  const moveRouteStop = (sourceId: string, targetId: string) => {
    setPlannedRouteIds((current) => {
      const fromIndex = current.indexOf(sourceId);
      const toIndex = current.indexOf(targetId);

      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
        return current;
      }

      const next = [...current];
      const [removed] = next.splice(fromIndex, 1);
      const insertionIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
      next.splice(insertionIndex, 0, removed);
      return next;
    });
  };

  const removeRouteStop = (leadId: string) => {
    setPlannedRouteIds((current) => current.filter((id) => id !== leadId));
  };

  const resetRoute = () => {
    setPlannedRouteIds(defaultRouteIds);
  };

  return (
    <section className="surface-card lead-map-panel">
      <div className="lead-map-header">
        <div>
          <p className="eyebrow">Map and route planning</p>
          <p className="muted">
            {leads.length > 0
              ? "Lead positions are plotted on a live street map so you can plan outreach by proximity."
              : "Run a scan to populate the map and route plan."}
          </p>
        </div>
        <div className="lead-map-header-actions">
          <p className="muted">{plannedRoute.length} route stops</p>
          {isRouteCustomized ? (
            <button type="button" className="button button-ghost button-small" onClick={resetRoute}>
              Reset route
            </button>
          ) : null}
          <button
            type="button"
            className="button button-ghost button-small"
            onClick={() => setIsExpanded((current) => !current)}
          >
            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            {isExpanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {!isExpanded ? (
        <div className="lead-map-collapsed">
          <strong>
            {displayLeads.length > 0
              ? `${displayLeads.length} nearby leads are mapped and ready for route planning.`
              : "No map data yet."}
          </strong>
          <p className="muted">Expand the panel to inspect the street map, zoom in or out, and plan a route.</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="lead-empty-state">
          <strong>No map data yet.</strong>
          <p className="muted">Once the queue processes, nearby leads will appear here for route planning.</p>
        </div>
      ) : (
        <div className="lead-map-layout">
          <div className="lead-map-canvas">
            <div ref={mapContainerRef} className="lead-leaflet-map" aria-label="Lead map" />
          </div>

          <aside className="lead-route-panel">
            <div className="lead-route-header">
              <p className="eyebrow">Suggested route</p>
              {plannedRouteUrl ? (
                <a
                  href={plannedRouteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="button button-ghost lead-route-button"
                >
                  <Route className="size-4" />
                  Open route
                </a>
              ) : (
                <span className="button button-ghost lead-route-button is-disabled">
                  <Route className="size-4" />
                  Open route
                </span>
              )}
            </div>

            <div className="lead-route-list">
              {plannedRoute.length === 0 ? (
                <div className="lead-empty-state">
                  <strong>No route stops left.</strong>
                  <p className="muted">Reset the route to bring back the nearby stops.</p>
                </div>
              ) : (
                plannedRoute.map((lead, index) => {
                  const isSelected = lead.id === selectedLeadId;
                  const isDragging = draggingLeadId === lead.id;
                  const isDropTarget = dropTargetId === lead.id;

                  return (
                    <div
                      key={lead.id}
                      className={[
                        "lead-route-item",
                        isSelected ? "is-selected" : "",
                        isDragging ? "is-dragging" : "",
                        isDropTarget ? "is-drop-target" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      draggable
                      onDragStart={(event) => {
                        setDraggingLeadId(lead.id);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", lead.id);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (draggingLeadId && draggingLeadId !== lead.id) {
                          setDropTargetId(lead.id);
                        }
                      }}
                      onDragLeave={() => {
                        setDropTargetId((current) => (current === lead.id ? null : current));
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const sourceId = event.dataTransfer.getData("text/plain") || draggingLeadId;
                        if (sourceId && sourceId !== lead.id) {
                          moveRouteStop(sourceId, lead.id);
                        }
                        setDraggingLeadId(null);
                        setDropTargetId(null);
                      }}
                      onDragEnd={() => {
                        setDraggingLeadId(null);
                        setDropTargetId(null);
                      }}
                    >
                      <div className="lead-route-item-header">
                        <button type="button" className="lead-route-select" onClick={() => onSelectLead(lead)}>
                          <strong>
                            {index + 1}. {lead.name}
                          </strong>
                          <span className="muted">
                            {lead.category} · {lead.distanceMiles.toFixed(1)} mi away
                          </span>
                        </button>

                        <div className="lead-route-item-actions">
                          <button
                            type="button"
                            className="lead-route-icon-button"
                            aria-label={`Drag ${lead.name}`}
                            title="Drag to reorder"
                          >
                            <GripVertical className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="lead-route-icon-button"
                            aria-label={`Remove ${lead.name} from route`}
                            title="Remove from route"
                            onClick={() => removeRouteStop(lead.id)}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>

                      <a
                        href={openDirectionsUrl(origin, lead)}
                        target="_blank"
                        rel="noreferrer"
                        className="lead-route-directions"
                      >
                        Directions
                      </a>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
