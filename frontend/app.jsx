// TailCheck — app shell + navigation
// Loaded last so all components above are on window.

const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "scenario": "N62849",
  "density": "comfortable",
  "signalTone": "default",
  "showSourceStrip": true,
  "showRawDrawer": true,
  "startScreen": "home",
  "forceLayout": "auto"
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const autoMode = window.useViewportMode(920);
  const mode = tweaks.forceLayout === 'auto' ? autoMode : tweaks.forceLayout;

  // Apply signal-tone variant (default vs all-grayscale-calm)
  useEffectA(() => {
    if (tweaks.signalTone === 'calm') {
      window.SIGNAL_STYLES = {
        "No major public records found": { color: '#9DBFA9', soft: 'rgba(157,191,169,0.12)', dot: '#9DBFA9' },
        "Some public records found":     { color: '#A8B6C9', soft: 'rgba(168,182,201,0.12)', dot: '#A8B6C9' },
        "Elevated public-records signal":{ color: '#C9A26B', soft: 'rgba(201,162,107,0.12)', dot: '#C9A26B' },
        "Incomplete / ambiguous data":   { color: '#8693A4', soft: 'rgba(134,147,164,0.12)', dot: '#8693A4' },
      };
    } else {
      window.SIGNAL_STYLES = {
        "No major public records found": { color: C.green,   soft: C.greenSoft,   dot: C.green   },
        "Some public records found":     { color: C.info,    soft: C.infoSoft,    dot: C.info    },
        "Elevated public-records signal":{ color: C.amber,   soft: C.amberSoft,   dot: C.amber   },
        "Incomplete / ambiguous data":   { color: C.neutral, soft: C.neutralSoft, dot: C.neutral },
      };
    }
    // Force a refresh by bumping state
    setForceTick((x) => x + 1);
  }, [tweaks.signalTone]);

  const [forceTick, setForceTick] = useStateA(0);

  // Navigation state
  const initial = tweaks.startScreen === 'profile'
    ? { name: 'profile', n: tweaks.scenario }
    : { name: 'home' };
  const [route, setRoute] = useStateA(initial);
  const [recents, setRecents] = useStateA([]);
  const [profileCache, setProfileCache] = useStateA({});
  const [lookupState, setLookupState] = useStateA(null);
  const [recordOverlay, setRecordOverlay] = useStateA(null); // { kind, record }
  const [rawOpen, setRawOpen] = useStateA(false);

  // When user picks a scenario in tweaks, jump there
  const lastScenario = React.useRef(tweaks.scenario);
  useEffectA(() => {
    if (tweaks.scenario && tweaks.scenario !== lastScenario.current) {
      lastScenario.current = tweaks.scenario;
      setRoute({ name: 'profile', n: tweaks.scenario });
      setRecordOverlay(null);
      setRawOpen(false);
    }
  }, [tweaks.scenario]);

  const lookup = async (input) => {
    const n = window.normalizeNNumber(input);
    if (!n) return;
    setLookupState({ status: 'loading', n_number: n });
    setRoute({ name: 'loading', n });
    const result = await window.lookupStaticAircraft(input);
    setLookupState(result);
    if (result.status === 'profile_found' && result.aircraft) {
      setRecents((rs) => [n, ...rs.filter((x) => x !== n)].slice(0, 5));
      setProfileCache((cache) => ({ ...cache, [n]: result.aircraft }));
      setRoute({ name: 'profile', n });
    } else {
      setRoute({ name: 'notfound', n, status: result.status });
    }
  };

  const goHome = () => {
    setRoute({ name: 'home' });
    setRecordOverlay(null);
    setRawOpen(false);
  };

  const aircraft = route.name === 'profile'
    ? (profileCache[route.n] || window.getAircraftByNNumber(route.n))
    : null;

  // Camera scan route is mobile-only — fall back to home on desktop.
  const effectiveRoute = (mode === 'desktop' && route.name === 'camera') ? { name: 'home' } : route;

  // ── Mobile body ──────────────────────────────────────────
  let mobileBody;
  if (effectiveRoute.name === 'home') {
    mobileBody = <HomeScreen
      onLookup={lookup}
      onOpenCamera={() => setRoute({ name: 'camera' })}
      density={tweaks.density}
      recents={recents}
    />;
  } else if (effectiveRoute.name === 'notfound') {
    mobileBody = <NotFoundScreen
      nNumber={effectiveRoute.n}
      status={effectiveRoute.status || (lookupState && lookupState.status)}
      onBack={goHome}
      onLookup={lookup}
    />;
  } else if (effectiveRoute.name === 'loading') {
    mobileBody = <LookupLoading nNumber={effectiveRoute.n} onBack={goHome} />;
  } else if (effectiveRoute.name === 'camera') {
    mobileBody = <CameraScreen
      onClose={goHome}
      onDetected={(n) => lookup(n)}
    />;
  } else if (effectiveRoute.name === 'profile' && aircraft) {
    mobileBody = <ProfileScreen
      key={aircraft.n_number + ':' + forceTick}
      aircraft={aircraft}
      onBack={goHome}
      density={tweaks.density}
      showSourceStrip={tweaks.showSourceStrip}
      showRawDrawer={tweaks.showRawDrawer}
      onOpenRecord={(rec) => setRecordOverlay(rec)}
      onOpenRaw={() => setRawOpen(true)}
    />;
  } else {
    mobileBody = <HomeScreen onLookup={lookup} onOpenCamera={() => setRoute({ name: 'camera' })} density={tweaks.density} recents={recents} />;
  }

  // ── Desktop body ─────────────────────────────────────────
  const [topbarQ, setTopbarQ] = useStateA('');
  const topbarSubmit = () => {
    const n = window.normalizeNNumber(topbarQ);
    if (!n) return;
    setTopbarQ('');
    lookup(n);
  };
  let desktopBody;
  if (effectiveRoute.name === 'profile' && aircraft) {
    desktopBody = <DesktopProfile
      key={aircraft.n_number + ':' + forceTick}
      aircraft={aircraft}
      onBack={goHome}
      showRawDrawer={tweaks.showRawDrawer}
      onOpenRecord={(rec) => setRecordOverlay(rec)}
      onOpenRaw={() => setRawOpen(true)}
    />;
  } else if (effectiveRoute.name === 'notfound') {
    desktopBody = <DesktopNotFound
      nNumber={effectiveRoute.n}
      status={effectiveRoute.status || (lookupState && lookupState.status)}
      onBack={goHome}
      onLookup={lookup}
    />;
  } else if (effectiveRoute.name === 'loading') {
    desktopBody = <DesktopLookupLoading nNumber={effectiveRoute.n} onBack={goHome} />;
  } else {
    desktopBody = <DesktopHome onLookup={lookup} recents={recents} />;
  }

  return (
    <div style={{
      width: '100vw', minHeight: '100vh',
      background: '#06080B',
      backgroundImage: mode === 'desktop' ? 'none' :
        ('radial-gradient(ellipse at top, rgba(107,160,255,0.06), transparent 50%), ' +
         'radial-gradient(ellipse at bottom, rgba(217,174,94,0.04), transparent 60%)'),
      ...(mode === 'desktop'
        ? {}
        : { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 12px', boxSizing: 'border-box' }),
    }}>
      {mode === 'desktop' ? (
        <>
          <DesktopTopBar
            value={topbarQ}
            onChange={setTopbarQ}
            onSubmit={topbarSubmit}
            onLogoClick={goHome}
          />
          {desktopBody}
          <RecordDetailDrawer
            open={!!recordOverlay}
            onClose={() => setRecordOverlay(null)}
            kind={recordOverlay && recordOverlay.kind}
            record={recordOverlay && recordOverlay.record}
          />
          <RawRecordsDrawer
            open={rawOpen}
            onClose={() => setRawOpen(false)}
            aircraft={aircraft}
          />
        </>
      ) : (
        <div style={{ position: 'relative' }}>
          <IOSDevice width={402} height={874} dark={true}>
            <div style={{
              position: 'relative', height: '100%',
              background: C.bg, color: C.text,
              display: 'flex', flexDirection: 'column',
              paddingTop: 56,
              overflow: 'hidden',
            }}>
              <div style={{ flex: 1, overflowY: effectiveRoute.name === 'camera' ? 'hidden' : 'auto', position: 'relative' }}>
                {mobileBody}
              </div>
              <RecordDetailDrawer
                open={!!recordOverlay}
                onClose={() => setRecordOverlay(null)}
                kind={recordOverlay && recordOverlay.kind}
                record={recordOverlay && recordOverlay.record}
              />
              <RawRecordsDrawer
                open={rawOpen}
                onClose={() => setRawOpen(false)}
                aircraft={aircraft}
              />
            </div>
          </IOSDevice>
        </div>
      )}

      {/* Tweaks panel */}
      <TweaksPanel title="Tweaks" noDeckControls={true}>
        <TweakSection label="Layout">
          <TweakRadio
            label="Form factor"
            value={tweaks.forceLayout}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'mobile', label: 'Mobile' },
              { value: 'desktop', label: 'Desktop' },
            ]}
            onChange={(v) => setTweak('forceLayout', v)}
          />
        </TweakSection>

        <TweakSection label="Scenario">
          <TweakSelect
            label="Aircraft"
            value={tweaks.scenario}
            options={window.DEMO_PACK.aircraft.map((a) => ({
              value: a.n_number,
              label: `${a.display_n_number} — ${a.demo_scenario}`,
            }))}
            onChange={(v) => setTweak('scenario', v)}
          />
          <TweakSelect
            label="Start screen"
            value={tweaks.startScreen}
            options={[
              { value: 'home', label: 'Home / search' },
              { value: 'profile', label: 'Profile (selected aircraft)' },
            ]}
            onChange={(v) => {
              setTweak('startScreen', v);
              if (v === 'profile') setRoute({ name: 'profile', n: tweaks.scenario });
              else setRoute({ name: 'home' });
            }}
          />
          <TweakButton label="Open camera scan" onClick={() => setRoute({ name: 'camera' })} secondary />
        </TweakSection>

        <TweakSection label="Display">
          <TweakRadio
            label="Density"
            value={tweaks.density}
            options={[
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'compact', label: 'Compact' },
            ]}
            onChange={(v) => setTweak('density', v)}
          />
          <TweakToggle
            label="Source coverage strip"
            value={tweaks.showSourceStrip}
            onChange={(v) => setTweak('showSourceStrip', v)}
          />
          <TweakToggle
            label="Raw records drawer"
            value={tweaks.showRawDrawer}
            onChange={(v) => setTweak('showRawDrawer', v)}
          />
        </TweakSection>

        <TweakSection label="Signal tone">
          <TweakRadio
            label="Palette"
            value={tweaks.signalTone}
            options={[
              { value: 'default', label: 'Color-coded' },
              { value: 'calm', label: 'Calm grays' },
            ]}
            onChange={(v) => setTweak('signalTone', v)}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// Mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
