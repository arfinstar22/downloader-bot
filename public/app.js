(() => {
  const tg = window.Telegram?.WebApp;

  // Initialize Telegram WebApp
  if (tg) {
    tg.ready();
    tg.expand();
    if (tg.enableClosingConfirmation) {
      tg.enableClosingConfirmation();
    }
  }

  // DOM Elements
  const urlInput = document.getElementById("urlInput");
  const btnClear = document.getElementById("btnClear");
  const btnPaste = document.getElementById("btnPaste");
  const btnDownload = document.getElementById("btnDownload");
  const detectionRow = document.getElementById("detectionRow");
  const platformChip = document.getElementById("platformChip");
  const chipIcon = document.getElementById("chipIcon");
  const chipName = document.getElementById("chipName");
  const formatPills = document.querySelectorAll(".format-pill");
  const progressCard = document.getElementById("progressCard");
  const progressTitle = document.getElementById("progressTitle");
  const progressBar = document.getElementById("progressBar");
  const progressDetail = document.getElementById("progressDetail");
  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const step3 = document.getElementById("step3");
  const resultCard = document.getElementById("resultCard");
  const resultSubtitle = document.getElementById("resultSubtitle");
  const btnReset = document.getElementById("btnReset");
  const btnCloseApp = document.getElementById("btnCloseApp");
  const errorCard = document.getElementById("errorCard");
  const errorMessage = document.getElementById("errorMessage");
  const btnRetry = document.getElementById("btnRetry");
  const userNameEl = document.getElementById("userName");

  let selectedFormat = "mp4";
  let detectedPlatform = null;

  // Setup user info from Telegram
  if (tg?.initDataUnsafe?.user) {
    const user = tg.initDataUnsafe.user;
    userNameEl.textContent = user.first_name || "Kamu";
  }

  // Platform definitions with branding colors & SVG icons
  const PLATFORMS_DATA = [
    {
      id: "youtube",
      name: "YouTube",
      pattern: /youtube\.com\/(?:watch|shorts|embed)|youtu\.be\/|music\.youtube\.com\//i,
      color: "#FF0000",
      iconSvg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    },
    {
      id: "tiktok",
      name: "TikTok",
      pattern: /tiktok\.com/i,
      color: "#00F2FE",
      iconSvg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
    },
    {
      id: "instagram",
      name: "Instagram",
      pattern: /instagram\.com/i,
      color: "#E1306C",
      iconSvg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
    },
    {
      id: "twitter",
      name: "Twitter / X",
      pattern: /(?:twitter\.com|x\.com)/i,
      color: "#FFFFFF",
      iconSvg: '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    },
    {
      id: "spotify",
      name: "Spotify",
      pattern: /spotify\.com/i,
      color: "#1DB954",
      iconSvg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>',
    },
    {
      id: "facebook",
      name: "Facebook",
      pattern: /facebook\.com|fb\.watch/i,
      color: "#1877F2",
      iconSvg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    },
    {
      id: "pinterest",
      name: "Pinterest",
      pattern: /pinterest\.com/i,
      color: "#E60023",
      iconSvg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0a12 12 0 0 0-4.37 23.18c-.07-.94-.13-2.39.03-3.42l1.09-4.62s-.28-.56-.28-1.39c0-1.3.76-2.28 1.7-2.28.8 0 1.19.6 1.19 1.33 0 .81-.51 2.01-.78 3.13-.23.95.48 1.72 1.41 1.72 1.69 0 2.99-1.78 2.99-4.35 0-2.28-1.64-3.87-3.97-3.87-2.71 0-4.3 2.03-4.3 4.13 0 .82.31 1.69.71 2.17.08.1.09.18.07.28l-.27 1.09c-.04.18-.15.22-.34.13-1.28-.59-2.07-2.46-2.07-3.95 0-3.22 2.34-6.17 6.74-6.17 3.54 0 6.29 2.52 6.29 5.89 0 3.51-2.21 6.34-5.28 6.34-1.03 0-2-.54-2.34-1.17l-.64 2.43c-.23.89-.86 2.01-1.28 2.7A12 12 0 1 0 12 0z"/></svg>',
    },
    {
      id: "soundcloud",
      name: "SoundCloud",
      pattern: /soundcloud\.com/i,
      color: "#FF5500",
      iconSvg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M1.175 12.225c-.04 0-.077.034-.083.078l-.276 2.38c-.007.054.027.088.083.088.044 0 .076-.034.083-.088l.276-2.38c.007-.044-.027-.078-.083-.078zm1.09-.798c-.053 0-.098.043-.105.105l-.369 3.993c-.007.062.038.106.105.106.052 0 .097-.044.104-.106l.369-3.993c.008-.062-.037-.105-.104-.105zm1.189-.854c-.066 0-.12.053-.13.13l-.409 5.706c-.008.077.046.13.13.13.065 0 .118-.053.128-.13l.409-5.706c.008-.077-.046-.13-.128-.13zm1.267.433c-.08 0-.142.062-.15.152l-.39 5.273c-.008.089.054.152.15.152.079 0 .141-.063.15-.152l.39-5.273c.009-.09-.053-.152-.15-.152zm1.313-.919c-.092 0-.164.072-.174.174l-.364 6.192c-.008.103.064.175.174.175.092 0 .164-.072.174-.175l.364-6.192c.008-.102-.064-.174-.174-.174zm1.343-.377c-.104 0-.186.082-.197.196l-.337 6.568c-.009.115.073.197.197.197.104 0 .187-.082.197-.197l.337-6.568c.008-.114-.073-.196-.197-.196zm1.365-.213c-.116 0-.208.092-.22.219l-.307 7.001c-.008.127.082.219.22.219.116 0 .208-.092.22-.219l.307-7.001c.009-.127-.082-.219-.22-.219zm1.378-.066c-.127 0-.229.102-.242.242l-.274 7.133c-.008.14.093.242.242.242.128 0 .23-.102.242-.242l.274-7.133c.009-.14-.093-.242-.242-.242zm1.385.033c-.139 0-.25.111-.264.264l-.238 7.099c-.009.153.102.264.264.264.14 0 .251-.111.265-.264l.238-7.099c.009-.153-.102-.264-.265-.264zm1.385.253c-.15 0-.27.121-.286.286l-.2 6.846c-.008.165.112.286.286.286.15 0 .27-.121.286-.286l.2-6.846c.008-.165-.112-.286-.286-.286zm1.386.385c-.161 0-.291.13-.308.308l-.161 6.538c-.008.177.123.308.308.308.162 0 .292-.131.309-.308l.161-6.538c.008-.178-.124-.308-.309-.308zm1.385.342c-.172 0-.311.14-.33.33l-.12 6.196c-.008.19.133.33.33.33.173 0 .312-.14.33-.33l.12-6.196c.009-.19-.132-.33-.33-.33zm1.386.164c-.183 0-.332.149-.352.352l-.08 5.854c-.008.203.143.352.352.352.183 0 .332-.149.352-.352l.08-5.854c.008-.203-.143-.352-.352-.352zm6.75 1.554c-.218 0-.428.026-.63.076-.419-2.146-2.308-3.753-4.577-3.753-.51 0-1 .082-1.458.232l-.082 7.798c.196.024.4.037.608.037h6.139c1.942 0 3.518-1.576 3.518-3.518s-1.576-3.872-3.518-3.872z"/></svg>',
    },
    {
      id: "reddit",
      name: "Reddit",
      pattern: /reddit\.com/i,
      color: "#FF4500",
      iconSvg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.703zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>',
    },
    {
      id: "applemusic",
      name: "Apple Music",
      pattern: /music\.apple\.com/i,
      color: "#FA243C",
      iconSvg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.89 12.63c-.15.25-.45.33-.7.18-.89-.54-2-.66-3.32-.36-.28.06-.57-.12-.63-.4-.06-.28.12-.57.4-.63 1.48-.34 2.72-.19 3.73.41.25.15.33.45.18.7zm1.04-2.31c-.19.3-.58.4-.88.21-1.11-.68-2.8-88-4.11-.48-.34.1-.7-.09-.81-.43-.1-.34.09-.7.43-.81 1.5-.45 3.38-.23 4.67.56.3.19.4.58.21.88zm.09-2.4c-1.33-.79-3.53-.86-4.8-.48-.41.13-.85-.11-.97-.52-.12-.41.11-.85.52-.97 1.48-.45 3.91-.36 5.45.55.37.22.49.71.27 1.08-.22.38-.71.5-1.08.27z"/></svg>',
    }
  ];

  // Detect platform by URL
  function detectPlatform(url) {
    if (!url || typeof url !== "string") return null;
    const clean = url.trim();
    for (const p of PLATFORMS_DATA) {
      if (p.pattern.test(clean)) return p;
    }
    // Generic fallback if valid URL
    if (/^https?:\/\//i.test(clean)) {
      return {
        id: "generic",
        name: "Universal Link",
        color: "#38BDF8",
        iconSvg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" y1="12" x2="22" y2="12"/></svg>'
      };
    }
    return null;
  }

  // Update UI on URL change
  function handleUrlChange() {
    const val = urlInput.value.trim();
    btnClear.style.display = val.length > 0 ? "flex" : "none";

    detectedPlatform = detectPlatform(val);

    if (detectedPlatform && val.length > 8) {
      detectionRow.style.display = "flex";
      chipName.textContent = detectedPlatform.name;
      chipIcon.innerHTML = detectedPlatform.iconSvg;
      chipIcon.style.color = detectedPlatform.color;
      platformChip.style.borderColor = detectedPlatform.color;
      btnDownload.disabled = false;

      // Highlight in supported showcase
      document.querySelectorAll(".platform-badge").forEach(b => {
        b.classList.toggle("highlight", b.dataset.platform === detectedPlatform.id);
      });
    } else {
      detectionRow.style.display = "none";
      btnDownload.disabled = true;
      document.querySelectorAll(".platform-badge").forEach(b => b.classList.remove("highlight"));
    }
  }

  urlInput.addEventListener("input", handleUrlChange);

  btnClear.addEventListener("click", () => {
    urlInput.value = "";
    handleUrlChange();
    urlInput.focus();
  });

  // Paste from clipboard
  btnPaste.addEventListener("click", async () => {
    try {
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
      const text = await navigator.clipboard.readText();
      if (text) {
        urlInput.value = text.trim();
        handleUrlChange();
      }
    } catch (_) {
      // Fallback: prompt
      const text = prompt("Tempel link video/audio di sini:");
      if (text) {
        urlInput.value = text.trim();
        handleUrlChange();
      }
    }
  });

  // Format selection
  formatPills.forEach(pill => {
    pill.addEventListener("click", () => {
      formatPills.forEach(p => {
        p.classList.remove("active");
        p.setAttribute("aria-checked", "false");
      });
      pill.classList.add("active");
      pill.setAttribute("aria-checked", "true");
      selectedFormat = pill.dataset.format;
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
    });
  });

  // Download Action
  btnDownload.addEventListener("click", async () => {
    const rawUrl = urlInput.value.trim();
    if (!rawUrl) return;

    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred("medium");

    // Hide cards, show progress
    resultCard.style.display = "none";
    errorCard.style.display = "none";
    progressCard.style.display = "flex";
    btnDownload.disabled = true;

    // Reset steps
    step1.className = "step-item active";
    step2.className = "step-item";
    step3.className = "step-item";
    progressBar.style.width = "25%";
    progressTitle.textContent = "Menganalisis link...";
    progressDetail.textContent = `Menghubungi media extractor untuk ${detectedPlatform?.name || "media"}...`;

    const userId = tg?.initDataUnsafe?.user?.id || null;

    try {
      // Advance step 1 -> 2
      setTimeout(() => {
        step1.className = "step-item done";
        step2.className = "step-item active";
        progressBar.style.width = "60%";
        progressTitle.textContent = "Mengunduh media...";
        progressDetail.textContent = "Stream media sedang diproses dengan kualitas terbaik...";
      }, 1200);

      // Advance step 2 -> 3
      setTimeout(() => {
        step2.className = "step-item done";
        step3.className = "step-item active";
        progressBar.style.width = "85%";
        progressTitle.textContent = "Mengirim ke chat Telegram...";
        progressDetail.textContent = "File video/audio sedang diunggah ke chat bot kamu...";
      }, 3500);

      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: rawUrl,
          format: selectedFormat,
          userId,
          initData: tg?.initData || ""
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal memproses unduhan.");
      }

      // Success
      step3.className = "step-item done";
      progressBar.style.width = "100%";

      setTimeout(() => {
        progressCard.style.display = "none";
        resultCard.style.display = "flex";
        resultSubtitle.textContent = `"${data.title || "Media"}" berhasil dikirim langsung ke chat bot kamu!`;
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
      }, 500);

    } catch (err) {
      console.error(err);
      progressCard.style.display = "none";
      errorCard.style.display = "flex";
      errorMessage.textContent = err.message || "Terjadi kesalahan pada server.";
      btnDownload.disabled = false;
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred("error");
    }
  });

  // Reset Button
  btnReset.addEventListener("click", () => {
    resultCard.style.display = "none";
    urlInput.value = "";
    handleUrlChange();
    urlInput.focus();
  });

  // Close Mini App
  btnCloseApp.addEventListener("click", () => {
    if (tg?.close) {
      tg.close();
    } else {
      window.close();
    }
  });

  // Retry Button
  btnRetry.addEventListener("click", () => {
    errorCard.style.display = "none";
    btnDownload.disabled = false;
  });

})();
