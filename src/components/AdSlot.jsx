// src/components/AdSlot.jsx
import { useEffect, useRef } from "react";

export default function AdSlot({ slot, layout="in-article", format="fluid", style }) {
  const ref = useRef(null);

  useEffect(() => {
    // Ensure the script exists (load once)
    if (!document.querySelector('script[data-adsbygoogle-loaded]')) {
      const s = document.createElement("script");
      s.async = true;
      s.crossOrigin = "anonymous";
      s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3857320396977962";
      s.setAttribute("data-adsbygoogle-loaded", "true");
      document.head.appendChild(s);
    }

    // Push once when the ins is ready and not already initialized
    const tryPush = () => {
      if (!ref.current) return;
      const already = ref.current.getAttribute("data-ad-status") === "filled";
      if (!already && window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
        window.adsbygoogle.push({});
      }
    };

    // Try now and again shortly after (covers initial script load)
    const t1 = setTimeout(tryPush, 0);
    const t2 = setTimeout(tryPush, 600);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

    return (
    <ins
        className="adsbygoogle"
        style={{ display: "block", ...(style || {}) }}
        data-ad-client="ca-pub-3857320396977962"   // your publisher ID
        data-ad-slot={slot}                        // e.g., "0000000000" pre-approval
        data-ad-format={format}
        data-ad-layout={layout}
        data-full-width-responsive="true"
        data-adtest="on"                           // ✅ test mode before approval
        ref={ref}
        aria-label="Advertisement"
    />
    );

}
