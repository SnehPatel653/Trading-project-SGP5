import React, { useEffect, useRef } from 'react';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load script: ' + src));
    document.head.appendChild(s);
  });
}

export default function TradingViewChart() {
  const containerRef = useRef(null);

  useEffect(() => {
    let widget = null;
    const init = async () => {
      try {
        await loadScript('https://s3.tradingview.com/tv.js');

        if (!window.TradingView) return;

        // Clear container
        if (containerRef.current) containerRef.current.innerHTML = '';

        widget = new window.TradingView.widget({
          container_id: 'tv_chart_container',
          autosize: true,
          symbol: 'AAPL',
          interval: '60',
          timezone: 'Etc/UTC',
          theme: 'light',
          style: '1',
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          allow_symbol_change: true,
          hide_side_toolbar: false,
          withdateranges: true,
          studies: [],
        });
      } catch (err) {
        // script failed to load — leave a message in the container
        if (containerRef.current) {
          containerRef.current.innerHTML = '<div class="p-4 text-red-600">Unable to load TradingView chart. Check network or use a local copy of the widget.</div>';
        }
      }
    };

    init();

    return () => {
      try {
        if (widget && widget.remove) widget.remove();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-semibold mb-4">Trading View Chart</h1>
      <div style={{ height: '600px' }} className="border rounded-md overflow-hidden">
        <div id="tv_chart_container" ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
