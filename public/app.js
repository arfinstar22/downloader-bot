(() => {
  const tg = window.Telegram?.WebApp;

  // Safe initialize Telegram WebApp
  if (tg) {
    try {
      if (typeof tg.ready === "function") tg.ready();
    } catch (_) {}
    try {
      const platform = (tg.platform || "").toLowerCase();
      const isDesktop = platform === "tdesktop" || platform === "macos" || platform === "weba" || platform === "webk" || platform === "web";
      // Only expand on mobile devices. Desktop Telegram has fixed window and expand() triggers frameless window bugs.
      if (!isDesktop && typeof tg.expand === "function") {
        tg.expand();
      }
    } catch (_) {}
    try {
      const platform = (tg.platform || "").toLowerCase();
      if (platform !== "tdesktop" && typeof tg.enableClosingConfirmation === "function") {
        tg.enableClosingConfirmation();
      }
    } catch (_) {}
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

  // Resolve active Chat ID & User Info
  const queryParams = new URLSearchParams(window.location.search);
  const queryChatId = queryParams.get("chatId");
  if (queryChatId) {
    try { localStorage.setItem("darfin_chat_id", queryChatId); } catch {}
  }
  const cachedChatId = (() => {
    try { return localStorage.getItem("darfin_chat_id"); } catch { return null; }
  })();

  const activeUserId = tg?.initDataUnsafe?.user?.id || queryChatId || cachedChatId || null;

  if (tg?.initDataUnsafe?.user?.first_name) {
    userNameEl.textContent = tg.initDataUnsafe.user.first_name;
  } else if (activeUserId) {
    userNameEl.textContent = "Terhubung";
  }

  // Platform definitions with branding colors & official icon images (all 30 platforms)
  const PLATFORMS_DATA = [
    {
      id: "youtube",
      name: "YouTube",
      iconUrl: "/icon/youtube.png",
      pattern: /youtube\.com\/(?:watch|shorts|embed|playlist)|youtu\.be\/|music\.youtube\.com\//i,
      color: "#FF0000",
    },
    {
      id: "tiktok",
      name: "TikTok",
      iconUrl: "/icon/tik-tok.png",
      pattern: /tiktok\.com/i,
      color: "#00F2FE",
    },
    {
      id: "instagram",
      name: "Instagram",
      iconUrl: "/icon/instagram.png",
      pattern: /instagram\.com\//i,
      color: "#E1306C",
    },
    {
      id: "twitter",
      name: "Twitter / X",
      iconUrl: "/icon/twitter.png",
      invert: true,
      pattern: /(?:^|https?:\/\/|\/\/)(?:[a-z0-9-]+\.)?(?:twitter|x)\.com\//i,
      color: "#FFFFFF",
    },
    {
      id: "spotify",
      name: "Spotify",
      iconUrl: "/icon/spotify.png",
      pattern: /spotify\.com\//i,
      color: "#1DB954",
    },
    {
      id: "facebook",
      name: "Facebook",
      iconUrl: "/icon/facebook.png",
      pattern: /facebook\.com\/|fb\.watch\//i,
      color: "#1877F2",
    },
    {
      id: "capcut",
      name: "CapCut",
      iconUrl: "/icon/capcut.png",
      invert: true,
      pattern: /(?:capcut\.com|capcutshare\.com)/i,
      color: "#00C4CC",
    },
    {
      id: "twitch",
      name: "Twitch Clips",
      iconUrl: "/icon/twitch.png",
      pattern: /(?:clips\.twitch\.tv\/|twitch\.tv\/[A-Za-z0-9_]+\/clip\/)/i,
      color: "#9146FF",
    },
    {
      id: "pinterest",
      name: "Pinterest",
      iconUrl: "/icon/pinterest.png",
      pattern: /pinterest\.com\//i,
      color: "#E60023",
    },
    {
      id: "snapchat",
      name: "Snapchat",
      iconUrl: "/icon/snapchat.png",
      pattern: /snapchat\.com\//i,
      color: "#FFFC00",
    },
    {
      id: "reddit",
      name: "Reddit",
      iconUrl: "/icon/reddit-icon.png",
      pattern: /reddit\.com\//i,
      color: "#FF4500",
    },
    {
      id: "applemusic",
      name: "Apple Music",
      iconUrl: "/icon/music.png",
      pattern: /music\.apple\.com\//i,
      color: "#FA243C",
    },
    {
      id: "soundcloud",
      name: "SoundCloud",
      iconUrl: "/icon/soundcloud.png",
      pattern: /soundcloud\.com\//i,
      color: "#FF5500",
    },
    {
      id: "threads",
      name: "Threads",
      iconUrl: "/icon/threads.png",
      pattern: /threads\.net\//i,
      color: "#FFFFFF",
    },
    {
      id: "bluesky",
      name: "Bluesky",
      iconUrl: "/icon/bluesky-icon.png",
      pattern: /bsky\.app\//i,
      color: "#0285FF",
    },
    {
      id: "streamable",
      name: "Streamable",
      iconUrl: "/icon/streamable.png",
      pattern: /streamable\.com\//i,
      color: "#0F9D58",
    },
    {
      id: "snackvideo",
      name: "SnackVideo",
      iconUrl: "/icon/snackvideo.png",
      pattern: /(?:snackvideo\.com|sck\.io|kwai\.com|kwai-video\.com)/i,
      color: "#FF7A00",
    },
    {
      id: "vimeo",
      name: "Vimeo",
      iconUrl: "/icon/vimeo.png",
      pattern: /vimeo\.com\//i,
      color: "#1AB7EA",
    },
    {
      id: "deezer",
      name: "Deezer",
      iconUrl: "/icon/deezer.png",
      pattern: /(?:deezer\.com|deezer\.page\.link)/i,
      color: "#A238FF",
    },
    {
      id: "audiomack",
      name: "Audiomack",
      iconUrl: "/icon/audiomack-logo.png",
      pattern: /audiomack\.com\//i,
      color: "#FFA200",
    },
    {
      id: "likee",
      name: "Likee",
      iconUrl: "/icon/likee-icon.png",
      pattern: /(?:likee\.video|like-video\.com|l\.likee\.video)/i,
      color: "#FF0050",
    },
    {
      id: "loom",
      name: "Loom",
      iconUrl: "/icon/loom.png",
      pattern: /loom\.com\/(?:share|embed)\//i,
      color: "#625DF5",
    },
    {
      id: "tidal",
      name: "Tidal",
      iconUrl: "/icon/tidal.png",
      invert: true,
      pattern: /(?:tidal\.com|listen\.tidal\.com)/i,
      color: "#000000",
    },
    {
      id: "bilibili",
      name: "Bilibili",
      iconUrl: "/icon/bilibili.png",
      pattern: /bilibili\.com\//i,
      color: "#00A1D6",
    },
    {
      id: "douyin",
      name: "Douyin",
      iconUrl: "/icon/douyin.png",
      pattern: /douyin\.com/i,
      color: "#FE2C55",
    },
    {
      id: "bandcamp",
      name: "Bandcamp",
      iconUrl: "/icon/bandcamp.png",
      pattern: /bandcamp\.com\//i,
      color: "#629AA9",
    },
    {
      id: "pixiv",
      name: "Pixiv",
      iconUrl: "/icon/pixiv.png",
      pattern: /pixiv\.net\//i,
      color: "#0096FA",
    },
    {
      id: "rednote",
      name: "RedNote",
      iconUrl: "/icon/rednote.png",
      pattern: /rednote\.com\/|xiaohongshu\.com\//i,
      color: "#FF2442",
    },
    {
      id: "terabox",
      name: "TeraBox",
      iconUrl: "/icon/terabox.png",
      pattern: /terabox\.com\//i,
      color: "#226DF6",
    },
    {
      id: "sfile",
      name: "Sfile.mobi",
      iconUrl: "/icon/sfile.mobi.webp",
      pattern: /sfile\.mobi\//i,
      color: "#3B82F6",
    },
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
      if (detectedPlatform.iconUrl) {
        chipIcon.innerHTML = `<img src="${detectedPlatform.iconUrl}" alt="${detectedPlatform.name}" class="chip-logo-img ${detectedPlatform.invert ? 'invert-white' : ''}">`;
      } else {
        chipIcon.innerHTML = detectedPlatform.iconSvg || "";
      }
      chipIcon.style.color = detectedPlatform.color;
      platformChip.style.borderColor = detectedPlatform.color;
      platformChip.setAttribute("data-platform", detectedPlatform.id);
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

    const targetUserId =
      tg?.initDataUnsafe?.user?.id ||
      new URLSearchParams(window.location.search).get("chatId") ||
      (() => { try { return localStorage.getItem("darfin_chat_id"); } catch { return null; } })() ||
      null;

    // Fallback: If no chatId detected but tg.sendData available, send data back to bot
    if (!targetUserId && tg && typeof tg.sendData === "function") {
      tg.sendData(JSON.stringify({ url: rawUrl, format: selectedFormat }));
      return;
    }

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
          userId: targetUserId,
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

  // Close Mini App (Result button & Header close button)
  const closeApp = () => {
    try {
      if (tg?.close) {
        tg.close();
      } else {
        window.close();
      }
    } catch (_) {
      window.close();
    }
  };

  btnCloseApp.addEventListener("click", closeApp);

  const btnCloseHeader = document.getElementById("btnCloseHeader");
  if (btnCloseHeader) {
    btnCloseHeader.addEventListener("click", closeApp);
  }

  // Retry Button
  btnRetry.addEventListener("click", () => {
    errorCard.style.display = "none";
    btnDownload.disabled = false;
  });

  // Interactive Pointer Spotlight (rAF throttled)
  const mainCard = document.querySelector(".main-card");
  if (mainCard) {
    let ticking = false;
    const updateSpotlight = (clientX, clientY) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const rect = mainCard.getBoundingClientRect();
          const x = clientX - rect.left;
          const y = clientY - rect.top;
          mainCard.style.setProperty("--mouse-x", `${x}px`);
          mainCard.style.setProperty("--mouse-y", `${y}px`);
          ticking = false;
        });
        ticking = true;
      }
    };

    mainCard.addEventListener("pointermove", (e) => {
      updateSpotlight(e.clientX, e.clientY);
    }, { passive: true });
  }

  // Interactive Platform Badges (ibelick/ui-skills feedback)
  document.querySelectorAll(".platform-badge").forEach((badge) => {
    badge.addEventListener("click", () => {
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
      badge.classList.add("highlight");
      setTimeout(() => badge.classList.remove("highlight"), 600);
      if (!urlInput.value.trim()) {
        urlInput.placeholder = `Tempel link ${badge.getAttribute("title") || "media"}...`;
        urlInput.focus();
      }
    });
  });

})();
