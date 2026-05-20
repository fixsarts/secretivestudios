/**
 * app.js — Bloom Nails
 * Fixes: tab switching bug (bottom cards disappearing)
 * New:   Background music player + Mobile/Desktop view toggle
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════
     1. TAB SWITCHING — FIXED
     Root cause of bug: previous code used position:absolute
     for hidden sections, collapsing layout height and clipping
     lower cards when returning to the Links tab.

     Fix: sections use display:none (hidden) / display:block
     (active). Animation is driven by the .is-entering class
     which triggers a CSS @keyframes — no position:absolute,
     no layout collapse, no clipping.
  ═══════════════════════════════════════════════ */

  const tabButtons = document.querySelectorAll('.tab-nav__btn');
  const sections   = document.querySelectorAll('.section');
  let   currentTab = 'links';

  function switchTab(target) {
    if (target === currentTab) return;
    currentTab = target;

    /* Update tab buttons */
    tabButtons.forEach(btn => {
      const isActive = btn.dataset.target === target;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });

    /* Switch sections */
    sections.forEach(section => {
      const name = section.id.replace('section-', '');

      if (name === target) {
        /* 1. Make visible (display:block, normal flow — no clipping) */
        section.classList.add('is-active');

        /* 2. Trigger animation on next paint */
        requestAnimationFrame(() => {
          section.classList.add('is-entering');
          /* Remove entering class after animation completes so it
             can retrigger cleanly next time this tab is visited */
          section.addEventListener('animationend', () => {
            section.classList.remove('is-entering');
          }, { once: true });
        });

      } else {
        /* Hide inactive section — remove both classes */
        section.classList.remove('is-active', 'is-entering');
      }
    });

    /* Scroll to content gently */
    const nav = document.querySelector('.tab-nav');
    const navH = nav ? nav.offsetHeight : 56;
    const shell = document.getElementById('pageShell');
    if (shell && document.documentElement.getAttribute('data-view') === 'desktop') {
      /* In desktop frame mode, scroll within shell */
      shell.scrollTo({ top: shell.scrollTop + 60, behavior: 'smooth' });
    } else {
      const main = document.getElementById('mainContent');
      if (main) {
        const y = main.getBoundingClientRect().top + window.scrollY - navH - 8;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      }
    }
  }

  /* Bind tab buttons */
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (target) switchTab(target);
    });

    /* Arrow key nav for accessibility */
    btn.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const all  = Array.from(tabButtons);
      const idx  = all.indexOf(btn);
      const next = e.key === 'ArrowRight'
        ? (idx + 1) % all.length
        : (idx - 1 + all.length) % all.length;
      all[next].focus();
      all[next].click();
    });
  });

  /* Ensure links section starts as active with entrance animation */
  (function initSections() {
    sections.forEach(section => {
      const name = section.id.replace('section-', '');
      if (name === 'links') {
        section.classList.add('is-active', 'is-entering');
        section.addEventListener('animationend', () => {
          section.classList.remove('is-entering');
        }, { once: true });
      } else {
        section.classList.remove('is-active', 'is-entering');
      }
    });
  })();


  /* ═══════════════════════════════════════════════
     2. BACKGROUND MUSIC PLAYER
  ═══════════════════════════════════════════════ */

  const audio       = document.getElementById('bgAudio');
  const musicToggle = document.getElementById('musicToggle');
  const musicTitle  = document.getElementById('musicTitle');

  /* Track list — replace src in index.html or extend here */
  const tracks = [
    { title: 'Lofi Aesthetic',   src: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3' },
    { title: 'Soft Pink Vibes',  src: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73467.mp3' },
    { title: 'Dreamy Chill',     src: 'https://cdn.pixabay.com/audio/2022/01/20/audio_d16737dc28.mp3' },
  ];
  let trackIndex = 0;
  let isPlaying  = false;

  function loadTrack(idx) {
    const track = tracks[idx];
    if (!track) return;
    audio.src = track.src;
    if (musicTitle) musicTitle.textContent = track.title;
    audio.load();
  }

  function setPlayingState(playing) {
    isPlaying = playing;
    if (musicToggle) musicToggle.classList.toggle('is-playing', playing);
    if (musicToggle) musicToggle.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
  }

  function toggleMusic() {
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setPlayingState(false);
    } else {
      /* Load track if not already set */
      if (!audio.src || audio.src === window.location.href) {
        loadTrack(trackIndex);
      }
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setPlayingState(true))
          .catch(err => {
            /* Autoplay blocked — show user feedback */
            console.warn('Audio play blocked:', err.message);
            setPlayingState(false);
            showToast('Tap the ♪ button to enable music 🎵');
          });
      }
    }
  }

  /* Advance to next track on song end */
  if (audio) {
    audio.addEventListener('ended', () => {
      trackIndex = (trackIndex + 1) % tracks.length;
      loadTrack(trackIndex);
      audio.play().then(() => setPlayingState(true)).catch(() => setPlayingState(false));
    });
  }

  if (musicToggle) {
    musicToggle.addEventListener('click', toggleMusic);
  }

  /* Pre-load first track metadata */
  loadTrack(0);


  /* ═══════════════════════════════════════════════
     3. VIEW MODE TOGGLE (Mobile / Desktop)
  ═══════════════════════════════════════════════ */

  const viewButtons = document.querySelectorAll('.view-btn');
  const htmlEl      = document.documentElement;

  function setView(view) {
    htmlEl.setAttribute('data-view', view);

    viewButtons.forEach(btn => {
      const isActive = btn.dataset.view === view;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });

    /* Persist preference */
    try { localStorage.setItem('bloom-view', view); } catch (_) {}
  }

  viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view) setView(view);
    });
  });

  /* Restore saved view preference */
  try {
    const saved = localStorage.getItem('bloom-view');
    if (saved === 'desktop' || saved === 'mobile') setView(saved);
  } catch (_) {}


  /* ═══════════════════════════════════════════════
     4. SHOP CARD INQUIRY → WhatsApp
  ═══════════════════════════════════════════════ */

  const WA_NUMBER = '628123456789'; // ← replace with real number

  document.querySelectorAll('.shop-card__cta').forEach(cta => {
    cta.addEventListener('click', e => {
      e.stopPropagation();
      const card  = cta.closest('.shop-card');
      const name  = card?.querySelector('.shop-card__name')?.textContent?.trim() ?? 'this design';
      const msg   = encodeURIComponent(
        `Halo Bloom Nails! 🌸 I'm interested in the "${name}" design. Could you share more details? ✨`
      );
      window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank', 'noopener,noreferrer');
    });
  });


  /* ═══════════════════════════════════════════════
     5. TOAST HELPER
  ═══════════════════════════════════════════════ */

  function showToast(msg) {
    let toast = document.getElementById('bloom-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'bloom-toast';
      Object.assign(toast.style, {
        position:     'fixed',
        bottom:       '24px',
        left:         '50%',
        transform:    'translateX(-50%)',
        background:   'rgba(201,63,122,0.92)',
        color:        '#fff',
        padding:      '10px 22px',
        borderRadius: '99px',
        fontSize:     '0.82rem',
        fontFamily:   'DM Sans, sans-serif',
        fontWeight:   '500',
        zIndex:       '9999',
        boxShadow:    '0 4px 16px rgba(0,0,0,0.2)',
        pointerEvents:'none',
        transition:   'opacity 300ms',
      });
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
  }

  /* ═══════════════════════════════════════════════
     6. IMAGE MODAL (POP-UP VIEWER)
  ═══════════════════════════════════════════════ */

  const imageModal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  const modalClose = document.getElementById('modalClose');
  const modalDownload = document.getElementById('modalDownload');
  const modalShare = document.getElementById('modalShare');
  let currentImageUrl = '';

  /* Handle image link clicks */
  document.querySelectorAll('.image-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href) openImageModal(href);
    });
  });

  function openImageModal(src) {
    if (!imageModal) return;
    currentImageUrl = src;
    modalImage.src = src;
    modalImage.alt = 'Zoom image';
    imageModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    /* Prevent scroll on body when modal is open */
    modalImage.onload = () => {
      /* Image loaded successfully */
    };
  }

  function closeImageModal() {
    if (!imageModal) return;
    imageModal.classList.add('is-closing');
    setTimeout(() => {
      imageModal.setAttribute('aria-hidden', 'true');
      imageModal.classList.remove('is-closing');
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
      currentImageUrl = '';
    }, 280);
  }

  /* Close button */
  if (modalClose) {
    modalClose.addEventListener('click', closeImageModal);
  }

  /* Close on backdrop click */
  if (imageModal) {
    imageModal.addEventListener('click', e => {
      if (e.target === imageModal || e.target === imageModal.querySelector('.image-modal__backdrop')) {
        closeImageModal();
      }
    });

    /* Close on Escape key */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && imageModal.getAttribute('aria-hidden') === 'false') {
        closeImageModal();
      }
    });
  }

  /* Download button */
  if (modalDownload) {
    modalDownload.addEventListener('click', () => {
      if (!currentImageUrl) return;
      
      /* Create a temporary link element */
      const link = document.createElement('a');
      link.href = currentImageUrl;
      
      /* Extract filename from URL or use default */
      const urlParts = currentImageUrl.split('/');
      const filename = urlParts[urlParts.length - 1] || 'image.jpg';
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast('📥 Gambar berhasil diunduh!');
    });
  }

  /* Share button */
  if (modalShare) {
    modalShare.addEventListener('click', () => {
      if (!currentImageUrl) return;
      const shareUrl = new URL(currentImageUrl, window.location.href).href;

      /* Use Web Share API if available */
      if (navigator.share) {
        navigator.share({
          title: 'Secretive Studio',
          text: 'Lihat desain cantik ini dari Secretive Studio! ✨',
          url: shareUrl
        }).catch(err => {
          if (err.name !== 'AbortError') {
            console.warn('Share error:', err);
            fallbackShare(shareUrl);
          }
        });
      } else {
        fallbackShare(shareUrl);
      }
    });
  }

  function fallbackShare(url) {
    const text = `Cek desain ini dari Secretive Studio: ${url}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('🔗 Link desain berhasil disalin!');
      }).catch(() => {
        showToast('💬 Salin link ini untuk dibagikan.');
      });
    } else {
      showToast('💬 Salin link ini untuk dibagikan.');
    }
  }

  console.info('🌸 Bloom Nails app ready.');

})();
