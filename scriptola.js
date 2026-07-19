(() => {
  "use strict";

  // ==========================================
  // 1. CONFIGURATION & STATE
  // ==========================================
  const CONFIG = Object.freeze({
    feedUrl: "https://dimperist.blogspot.com/feeds/posts/default?alt=json&max-results=106",
    pinnedPostPath: "/2026/06/12.html",
    scriptUrl: "https://script.google.com/macros/s/AKfycbx2gHWrrA3A0MjsQLz30e3NFSpr6BzorfRf08ZR_v5of87VcgQjNSJJ_Re0ivyZYcLTxA/exec",
    reactionHideDelay: 5400,
    sliderNormalDuration: 5000,
    sliderPinnedDuration: 8000
  });

  const DEFAULT_IMAGES = Object.freeze([
    "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjFiu4dVYlPwxK3xtwKSurxCvPBaryI-jgcqysrU2BrKHbxlVOOKiZUT-v7wTK8UbMCfzNUjbA7aNk1e51z093ft3yC6_GkBbHu4I1-3DaxdfK-gbuzazZ0HNSBjrJ2gM_4GBBrRyFabK23uIZmXwgaezpRieBPTBWCE4pCm6kal9nAGG_5wAOsbIR7_Q8/s320/Gemini_Generated_Image_kj2jlbkj2jlbkj2j.png",
    "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEicnwcf5MtSIS5zph5DxV7oJnr5y7Boimib6Wpq4NGfyLvr7xCU6bU3muKSFERVBVYj0BzVBzI0JORWKuJkbLo4YrCE9S4Efu2Q3MyvOtMtX7ZfIyoZGQ5kqQLHh3ZvjQfaP6xx-RYwEshSLmLnsQxGKnbJnNmJVbVi4JaG-SvM-knJzZWTZ7Y7XreDlME/s320/Gemini_Generated_Image_y8h9zxy8h9zxy8h9.png",
    "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhRiqsHKDiJK_tfJo5VAqpx_s1wASZGYnSNQDfhhFEDYNowBmPGAfUQMjlTTsJSK8Rvg_aL7RSiCgc7Edx6z8W-UnB3jS_8Z5BtW2-K7gkr4dUlOCt7Q1b-n4xGJk86OzxPsWFyymq0AuIEKNcaDKp36RcnUxdcQyF-JtQDQuojBqc_2okh9-w0Bd9o1aM/s320/Gemini_Generated_Image_pa075bpa075bpa07.png",
    "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh98wnzkmN_Kry_Uvi_NfprZD7n9yq85Pn-ywWbjNMNQ6X7opEGMo3p5C3L5hX9qTRIEXFaRux56pMptwV7Zg-n9nNSWcfpmYBxZ2TfS2ojJHc5gZjd-IZ5ki2jGu8FIcRKUzFSulm8Ac-pVIIe9HTRxHgSg4eso3TjvxW8tAZByBYZNVLFft7EBo7T-H0/s320/Gemini_Generated_Image_ox9wwxox9wwxox9w.png"
  ]);

  const STATE = {
    isTouchDevice: false,
    isPausedByTitle: false,
    isDragging: false,
    wasDragged: false
  };

  const REGEX = Object.freeze({
    YT: /(?:embed\/|v=|youtu\.be\/|vi\/|\/v\/|e\/|watch\?v=)([^#\&\?]{11})/,
    YT_IMG: /img\.youtube\.com\/vi\/([a-zA-Z0-9_-]{11})/,
    IMG_SIZE: /\/(w\d+-h\d+|s\d+)[^\/]*\//,
    FB: /facebook\.com\/(?:plugins\/video|video)/
  });

  const PASSIVE = { passive: true };

  window.addEventListener('touchstart', () => { STATE.isTouchDevice = true; }, { ...PASSIVE, once: true });

  // ==========================================
  // 2. UTILS & HELPERS
  // ==========================================
  const Utils = {
    getRandomImg: () => DEFAULT_IMAGES[Math.floor(Math.random() * DEFAULT_IMAGES.length)],

    upscaleImgUrl: (url) => {
      if (!url || REGEX.FB.test(url)) return Utils.getRandomImg();
      if (url.includes('img.youtube.com')) return url.replace('hqdefault.jpg', 'maxresdefault.jpg');
      if (REGEX.IMG_SIZE.test(url)) {
        return url.replace(REGEX.IMG_SIZE, window.innerWidth <= 868 ? '/s800-rw/' : '/s1600-rw/');
      }
      return url;
    },

    getThumbnailUrl: (url) => {
      if (!url || url.includes('facebook.com')) return url;
      if (url.includes('img.youtube.com')) return url.replace('maxresdefault.jpg', 'hqdefault.jpg');
      if (REGEX.IMG_SIZE.test(url)) return url.replace(REGEX.IMG_SIZE, '/s150-c-rw/');
      return url;
    },

    handleImageFallback: (imgEl) => {
      const fallback = function(e) {
        if (this.src.includes('maxresdefault.jpg') && (this.naturalWidth <= 120 || e?.type === 'error')) {
          this.src = this.src.replace('maxresdefault.jpg', 'hqdefault.jpg');
        }
      };
      imgEl.onload = fallback;
      imgEl.onerror = fallback;
    },

    extractData: (htmlStr) => {
      if (!htmlStr) return { imgs: [Utils.getRandomImg()], text: "" };
      
      const doc = new DOMParser().parseFromString(htmlStr, 'text/html');
      const imgs = Array.from(doc.images).map(img => img.src).filter(Boolean);
      
      doc.querySelectorAll('iframe').forEach(iframe => {
        const src = iframe.src || '';
        const match = src.match(REGEX.YT);
        if (match?.[1]) imgs.push(`https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`);
        else if (REGEX.FB.test(src)) imgs.push(src); 
      });
      
      doc.querySelectorAll('style, script').forEach(el => el.remove());
      
      doc.querySelectorAll('a').forEach(a => {
        const txt = a.textContent.trim();
        if (txt) a.replaceWith(`[[[${txt}]]]`);
      });
      
      const fullText = (doc.body.textContent || "").replace(/\s+/g, ' ').trim();
      return { 
        imgs: imgs.length ? imgs : [Utils.getRandomImg()], 
        text: fullText 
      };
    },

    buildSafeTextNodes: (text, containerEl) => {
      containerEl.textContent = ''; 
      const parts = text.split(/\[\[\[(.*?)\]\]\]/g);
      const fragment = document.createDocumentFragment();
      parts.forEach((part, idx) => {
        if (!part) return;
        if (idx % 2 === 1) { 
          const span = Object.assign(document.createElement('span'), { className: 'fake-link', textContent: part });
          fragment.appendChild(span);
        } else {
          fragment.appendChild(document.createTextNode(part));
        }
      });
      containerEl.appendChild(fragment);
    },

    forceReflow: (el) => { void el.offsetWidth; },

    throttle: (func, limit) => {
      let inThrottle;
      return function(...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => { inThrottle = false; }, limit);
        }
      };
    }
  };

  // ==========================================
  // 3. NAV MANAGER
  // ==========================================
  const NavManager = {
    init: () => {
      const nav = document.querySelector('nav');
      if (!nav) return;
      
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const isScrolled = window.scrollY > 350;
            nav.classList.toggle('nav-fixed', isScrolled);
            document.body.classList.toggle('nav-is-fixed', isScrolled);
            ticking = false;
          });
          ticking = true;
        }
      }, PASSIVE);

      let idleTimeout;
      const resetIdleTimer = Utils.throttle(() => {
        nav.classList.remove('nav-hidden-active');
        clearTimeout(idleTimeout);
        idleTimeout = setTimeout(() => {
          document.querySelector('.nav-fixed')?.classList.add('nav-hidden-active');
        }, 2000);
      }, 200);

      ['mousemove', 'scroll', 'touchstart', 'keydown'].forEach(evt => 
        window.addEventListener(evt, resetIdleTimer, PASSIVE)
      );

      document.addEventListener('click', (e) => {
        if (!nav.contains(e.target)) {
          document.querySelectorAll('.dropdown-content, .sub-dropdown-content').forEach(d => {
            d.style.display = 'none';
            setTimeout(() => { d.style.display = ''; }, 100);
          });
          resetIdleTimer();
        }
      });
      resetIdleTimer();
    }
  };

  // ==========================================
  // 4. REACTIONS MANAGER
  // ==========================================
  const ReactionsManager = {
    observer: new IntersectionObserver((entries, observer) => {
      entries.forEach(async entry => {
        if (entry.isIntersecting) {
          const rDiv = entry.target;
          observer.unobserve(rDiv);
          const postId = rDiv.dataset.postid;
          
          try {
            const res = await fetch(`${CONFIG.scriptUrl}?postId=${encodeURIComponent(postId)}&nocache=${Date.now()}`);
            if (!res.ok) return;
            const data = await res.json();
            rDiv.querySelector('.count-love').textContent = data.love || 0;
            rDiv.querySelector('.count-funny').textContent = data.funny || 0;
            rDiv.querySelector('.count-wow').textContent = data.wow || 0;
          } catch (e) {
            // Σιωπηρή αποτυχία ώστε να μην κρασάρει ποτέ χωρίς ίντερνετ
          } 
        }
      });
    }, { rootMargin: '50px 0px', threshold: 0.1 }),
    
    handleVote: async (btn) => {
      const rDiv = btn.closest('.floating-reactions');
      if (!rDiv || rDiv.classList.contains('is-voting') || rDiv.classList.contains('voted')) return;
      
      const postId = rDiv.dataset.postid;
      const type = btn.dataset.type;
      const countSpan = btn.querySelector('span:last-child');
      
      rDiv.classList.add('is-voting', 'voted');
      rDiv.style.pointerEvents = 'none';
      localStorage.setItem(`feedback_${postId}`, 'voted');
      
      // Optimistic update (Δείχνει την αλλαγή άμεσα πριν περιμένει τον Server)
      countSpan.textContent = (parseInt(countSpan.textContent, 10) || 0) + 1;

      try {
        const res = await fetch(`${CONFIG.scriptUrl}?postId=${encodeURIComponent(postId)}&emoji=${type}`, { method: 'GET', keepalive: true });
        if (res.ok) {
          const data = await res.json();
          if (data?.[type] !== undefined) countSpan.textContent = data[type];
        }
      } catch (e) {
      } finally {
        rDiv.classList.remove('is-voting');
      }
    }
  };

  // ==========================================
  // 5. LIGHTBOX MANAGER
  // ==========================================
  const LightboxManager = {
    el: document.getElementById('custom-lightbox'),
    img: document.getElementById('lightbox-img'),
    video: document.getElementById('lightbox-video'),
    counter: document.querySelector('.lightbox-counter'),
    download: document.getElementById('lightbox-download'),
    thumbnailsCont: document.querySelector('.lightbox-thumbnails'),
    images: [],
    index: 0,
    videoInterval: null,
    lastFocus: null,
    
    init: () => {
      const LM = LightboxManager;
      if (!LM.el) return;
      
      LM.el.setAttribute("role", "dialog");
      LM.el.setAttribute("aria-label", "Προβολή Εικόνων");
      document.querySelector('.lightbox-close')?.setAttribute("aria-label", "Κλείσιμο");
      document.querySelector('.lightbox-prev')?.setAttribute("aria-label", "Προηγούμενη εικόνα");
      document.querySelector('.lightbox-next')?.setAttribute("aria-label", "Επόμενη εικόνα");

      document.querySelector('.lightbox-close')?.addEventListener('click', LM.close);
      document.querySelector('.lightbox-next')?.addEventListener('click', (e) => { e.stopPropagation(); LM.next(); });
      document.querySelector('.lightbox-prev')?.addEventListener('click', (e) => { e.stopPropagation(); LM.prev(); });
      LM.el.addEventListener('click', (e) => { if (e.target === LM.el) LM.close(); });
      
      LM.thumbnailsCont?.addEventListener('click', (e) => {
        const thumbBtn = e.target.closest('.thumb-img');
        if (thumbBtn) {
          e.stopPropagation();
          LM.index = parseInt(thumbBtn.dataset.index, 10);
          LM.update();
        }
      });

      let startX = 0, endX = 0;
      LM.el.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, PASSIVE);
      LM.el.addEventListener('touchmove', e => { endX = e.touches[0].clientX; }, PASSIVE);
      LM.el.addEventListener('touchend', () => {
        if (endX === 0) return;
        const diff = startX - endX;
        if (Math.abs(diff) > 50) diff > 0 ? LM.next() : LM.prev();
        endX = 0;
      });
      
      document.addEventListener('keydown', (e) => {
        if (!LM.el.classList.contains('active')) return;
        if (e.key === 'Escape') LM.close();
        else if (e.key === 'ArrowRight') LM.next();
        else if (e.key === 'ArrowLeft') LM.prev();
      });
    },
    
    open: (imgs) => {
      const LM = LightboxManager;
      LM.lastFocus = document.activeElement; 
      document.body.classList.add('lb-active');
      document.body.style.overflow = 'hidden';
      
      if (window.SliderManager) {
        window.SliderManager.pause();
        if (window.SliderManager.progressBar) {
           window.SliderManager.progressBar.style.transition = 'none';
           window.SliderManager.progressBar.style.width = '0%';
        }
      }
      
      LM.images = imgs.map(img => img.includes('facebook.com') ? img : Utils.upscaleImgUrl(img));
      LM.index = 0;
      LM.thumbnailsCont.innerHTML = '';
      
      const fragment = document.createDocumentFragment();
      LM.images.forEach((src, idx) => {
        const thumbBtn = Object.assign(document.createElement('button'), {
          className: 'thumb-img',
          'aria-label': `Προβολή εικόνας ${idx + 1}`
        });
        thumbBtn.dataset.index = idx;
        thumbBtn.style.cssText = 'padding:0; border:none; background-color:transparent; overflow:hidden;';
        
        const match = src.match(REGEX.YT);
        const isFb = REGEX.FB.test(src);
        const videoId = (match?.[1] && !isFb) ? match[1] : null;
        
        const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` 
                       : isFb ? Utils.getRandomImg() 
                       : Utils.getThumbnailUrl(src); 
        
        const imgInner = Object.assign(document.createElement('img'), {
          src: thumbUrl,
          alt: `Thumbnail ${idx + 1}`,
          loading: "lazy" // Native browser performance
        });
        imgInner.style.cssText = 'width:100%; height:100%; object-fit:cover; pointer-events:none;';
        
        thumbBtn.appendChild(imgInner);
        fragment.appendChild(thumbBtn);

        if (!videoId && !isFb && idx < 3) {
            const preImg = new Image();
            preImg.src = src;
        }
      });
      LM.thumbnailsCont.appendChild(fragment);
      
      LM.update();
      LM.el.classList.add('active');
      
      LM.videoInterval = setInterval(() => {
        if (document.activeElement?.id === 'lightbox-video') window.focus();
      }, 500);
    },
    
    close: () => {
      const LM = LightboxManager;
      LM.el.classList.remove('active');
      document.body.classList.remove('lb-active');
      document.body.style.overflow = '';
      
      if (LM.video) LM.video.src = ''; // Αδειάζει το βίντεο για να μην παίζει background
      clearInterval(LM.videoInterval); 
      
      LM.lastFocus?.focus(); 
      window.SliderManager?.resume(true);
    },
    
    next: () => { LightboxManager.index = (LightboxManager.index + 1) % LightboxManager.images.length; LightboxManager.update(); },
    prev: () => { LightboxManager.index = (LightboxManager.index - 1 + LightboxManager.images.length) % LightboxManager.images.length; LightboxManager.update(); },
    
    update: () => {
      const LM = LightboxManager;
      if (!LM.images.length) return;
      
      const currentSrc = LM.images[LM.index];
      const ytMatch = currentSrc.match(REGEX.YT_IMG);
      const isFb = REGEX.FB.test(currentSrc);
      
      if (ytMatch?.[1]) {
        LM.img.style.display = 'none'; 
        LM.video.style.display = 'block';
        LM.video.src = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
        LM.download.style.display = 'none';
      } else if (isFb) {
        LM.img.style.display = 'none'; 
        LM.video.style.display = 'block';
        LM.video.src = currentSrc;
        LM.download.style.display = 'none';
      } else {
        LM.video.style.display = 'none'; 
        LM.video.src = "";
        LM.img.style.display = 'block'; 
        LM.img.src = currentSrc;
        LM.download.style.display = 'block';
        
        LM.download.onclick = async (e) => {
          e.preventDefault();
          try {
            const res = await fetch(currentSrc);
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = Object.assign(document.createElement('a'), {
              href: url,
              download: 'sxoleio_photo.jpg'
            });
            a.style.display = 'none'; 
            document.body.appendChild(a); 
            a.click(); 
            a.remove(); // Μηδενίζει την διαρροή μνήμης (Memory leak)
            window.URL.revokeObjectURL(url);
          } catch (err) {
            window.open(currentSrc, '_blank');
          }
        };
      }
      
      if (LM.counter) LM.counter.textContent = `${LM.index + 1} από ${LM.images.length}`;
      
      LM.thumbnailsCont.querySelectorAll('.thumb-img').forEach((thumb, idx) => {
        const isActive = idx === LM.index;
        thumb.classList.toggle('active', isActive);
        if (isActive) thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      });
    }
  };

  // ==========================================
  // 6. SLIDER MANAGER
  // ==========================================
  window.SliderManager = {
    container: document.getElementById('recent-slider'),
    progressBar: null,
    slides: [],
    index: 0,
    interval: null,
    touch: { startX: 0, startY: 0, endX: 0, endY: 0 },
    arrowTimeout: null,
    
    init: async () => {
      const SM = window.SliderManager;
      if (!SM.container) return;
      
      try {
        const res = await fetch(CONFIG.feedUrl);
        const data = await res.json();
        const entries = data.feed?.entry || [];
        
        const pinnedIndex = entries.findIndex(entry => 
          entry.link?.some(l => l.rel === "alternate" && l.href.includes(CONFIG.pinnedPostPath))
        );

        if (pinnedIndex > 0) {
          entries.unshift(entries.splice(pinnedIndex, 1)[0]);
        } else if (pinnedIndex === -1) {
          try {
            const sRes = await fetch(`https://dimperist.blogspot.com/feeds/posts/default?alt=json&path=${CONFIG.pinnedPostPath}`);
            const sData = await sRes.json();
            if (sData?.feed?.entry?.[0]) entries.unshift(sData.feed.entry[0]);
          } catch(e) {}
        }
        SM.buildDOM(entries);
      } catch (e) {
        SM.container.innerHTML = '<div class="no-images">Σφάλμα φόρτωσης αναρτήσεων.</div>';
      }
    },
    
    buildDOM: (entries) => {
      const SM = window.SliderManager;
      if (!entries.length) {
        SM.container.innerHTML = '<div class="no-images">Δεν βρέθηκαν αναρτήσεις.</div>';
        return;
      }
      
      const fragment = document.createDocumentFragment(); 
      SM.progressBar = Object.assign(document.createElement('div'), { id: 'progress-bar' });
      fragment.appendChild(SM.progressBar);
      
      const chunkSize = (window.innerWidth > 900) ? 330 : 68;

      entries.forEach((entry, idx) => {
        const href = entry.link?.find(l => l.rel === "alternate")?.href || "#";
        const title = entry.title?.$t || "Άρθρο";
        const isPinned = href.includes(CONFIG.pinnedPostPath);
        
        const { imgs, text: fullText } = Utils.extractData(entry.content?.$t || "");
        
        const textChunks = [];
        if (!fullText) {
          textChunks.push("Δεν υπάρχει κείμενο σε αυτή την ανακοίνωση.");
        } else if (fullText.length <= chunkSize) {
          textChunks.push(fullText);
        } else {
          let i = 0;
          while (i < fullText.length) {
            if (i + chunkSize >= fullText.length) { 
              textChunks.push(fullText.substring(i).trim()); break; 
            }
            const sliceEnd = i + chunkSize;
            const lastSpace = fullText.lastIndexOf(' ', sliceEnd);
            
            if (lastSpace > i) {
              textChunks.push(fullText.substring(i, lastSpace).trim() + "...");
              i = lastSpace + 1;
            } else {
              textChunks.push(fullText.substring(i, sliceEnd).trim() + "...");
              i = sliceEnd;
            }
          }
        }

        const slide = Object.assign(document.createElement('a'), {
          href, rel: "noopener", draggable: false,
          className: `slide ${isPinned ? "pinned-contain" : ""}`
        });
        slide.setAttribute("aria-hidden", "true"); 
        slide.ondragstart = (e) => e.preventDefault();
        
        const imgEl = Object.assign(document.createElement("img"), {
          alt: title, draggable: false
        });
        Utils.handleImageFallback(imgEl);
        imgEl.ondragstart = (e) => e.preventDefault();
        
        if (idx === 0) {
          imgEl.src = Utils.upscaleImgUrl(imgs[0]);
          imgEl.setAttribute("fetchpriority", "high"); 
        } else {
          imgEl.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E";
          imgEl.dataset.fullSrc = Utils.upscaleImgUrl(imgs[0]); 
          imgEl.loading = "lazy";
        }
        slide.appendChild(imgEl);
        
        if (!isPinned && idx < 6) {
          slide.appendChild(Object.assign(document.createElement("div"), {
            className: "new-badge", textContent: "Νέα"
          }));
        }
        
        const caption = Object.assign(document.createElement("div"), { className: "slide-title" });
        caption.appendChild(Object.assign(document.createElement("strong"), { textContent: title }));
        
        const descContainer = Object.assign(document.createElement("div"), { className: "slide-desc-container" });
        const descEl = Object.assign(document.createElement("div"), { className: "slide-desc" });
        Utils.buildSafeTextNodes(textChunks[0], descEl);
        descContainer.appendChild(descEl);
        
        if (textChunks.length > 1) {
          const paginationControls = Object.assign(document.createElement("div"), { className: "snippet-pagination" });
          paginationControls.dataset.current = "0";
          
          paginationControls.innerHTML = `
            <button class="snippet-btn disabled" aria-label="Προηγούμενο κείμενο" data-action="prev-snippet">&#10094;</button>
            <button class="snippet-btn" aria-label="Επόμενο κείμενο" data-action="next-snippet">&#10095;</button>
          `;
          descContainer.appendChild(paginationControls);

          let textStartX = 0;
          descContainer.addEventListener('touchstart', (e) => { textStartX = e.touches[0].clientX; e.stopPropagation(); }, PASSIVE);
          descContainer.addEventListener('touchend', (e) => {
            const diff = textStartX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 40) {
              const action = diff > 0 ? "next-snippet" : "prev-snippet";
              descContainer.querySelector(`[data-action="${action}"]`)?.click();
              e.stopPropagation();
            }
          }, PASSIVE);
        }
        caption.appendChild(descContainer);
        
        const postId = href ? new URL(href).pathname : "";
        if (postId?.length > 3) {
          const isVoted = localStorage.getItem(`feedback_${postId}`);
          const reactDiv = Object.assign(document.createElement("div"), { className: `floating-reactions ${isVoted ? 'voted' : ''}` });
          reactDiv.dataset.postid = postId;
          
          reactDiv.innerHTML = `
            <button class="floating-btn" data-type="love" aria-label="Αγαπώ"><span>❤️</span><span class="count-love">0</span></button>
            <button class="floating-btn" data-type="funny" aria-label="Αστείο"><span>😂</span><span class="count-funny">0</span></button>
            <button class="floating-btn" data-type="wow" aria-label="Ουάου"><span>😮</span><span class="count-wow">0</span></button>
          `;
          ReactionsManager.observer.observe(reactDiv);
          slide.appendChild(reactDiv);
        }
        
        const hasVideo = imgs.some(src => src.includes('img.youtube.com') || REGEX.FB.test(src));
        if (imgs.length >= 2 || hasVideo) {
          const zoomBtn = Object.assign(document.createElement("button"), {
            className: "zoom-icon",
            innerHTML: hasVideo ? "▶️" : "🔍"
          });
          zoomBtn.setAttribute("aria-label", hasVideo ? "Αναπαραγωγή βίντεο" : "Προβολή εικόνων");
          zoomBtn.dataset.action = "zoom";
          zoomBtn.style.cssText = 'border:none; outline:none;';
          slide.appendChild(zoomBtn);
        }
        
        slide.appendChild(caption);
        fragment.appendChild(slide);
        SM.slides.push({ el: slide, imgs, chunks: textChunks });
      });
      
      const navArrows = document.createElement('div');
      navArrows.innerHTML = `
        <button class="slider-arrow left" aria-label="Προηγούμε ανακοίνωση" data-action="prev-slide">&#10094;</button>
        <button class="slider-arrow right" aria-label="Επόμενη ανακοίνωση" data-action="next-slide">&#10095;</button>
      `;
      while (navArrows.firstChild) fragment.appendChild(navArrows.firstChild);
      
      SM.container.appendChild(fragment); 

      if (SM.slides.length > 0) {
        SM.index = 0;
        SM.slides[0].el.classList.add("active");
        SM.slides[0].el.setAttribute("aria-hidden", "false");
        
        [1 % SM.slides.length, (SM.slides.length - 1 + SM.slides.length) % SM.slides.length].forEach(idx => {
            const img = SM.slides[idx]?.el.querySelector("img");
            if (img?.dataset.fullSrc) {
                img.src = img.dataset.fullSrc;
                delete img.dataset.fullSrc;
            }
        });
      }
      
      SM.setupEvents();
      SM.resetProgress();
      SM.resume();
    },
    
    resetProgress: (force = false) => {
      const SM = window.SliderManager;
      if (!SM.progressBar) return;
      
      SM.progressBar.style.transition = 'none';
      SM.progressBar.style.width = '0%';
      
      if (document.body.classList.contains('lb-active') || (!force && !STATE.isTouchDevice && SM.container.matches(':hover'))) return;
      
      Utils.forceReflow(SM.progressBar);
      window.requestAnimationFrame(() => {
        const isPinned = SM.slides[SM.index]?.el.classList.contains('pinned-contain');
        const dur = (isPinned ? CONFIG.sliderPinnedDuration : CONFIG.sliderNormalDuration) / 1000;
        SM.progressBar.style.transition = `width ${dur}s linear`;
        SM.progressBar.style.width = '100%';
      });
    },
    
    changeSlide: (newIndex, force) => {
      const SM = window.SliderManager;
      if (STATE.isPausedByTitle) {
        if (SM.progressBar) {
            SM.progressBar.style.transition = 'none';
            SM.progressBar.style.width = '100%';
        }
        return;
      }
      
      SM.slides[SM.index].el.classList.remove("active");
      SM.slides[SM.index].el.setAttribute("aria-hidden", "true");
      
      SM.index = newIndex;
      const nextSlide = SM.slides[SM.index];
      nextSlide.el.classList.add("active");
      nextSlide.el.setAttribute("aria-hidden", "false");

      const preloadNext = (newIndex + 1) % SM.slides.length;
      const preloadPrev = (newIndex - 1 + SM.slides.length) % SM.slides.length;
      
      [newIndex, preloadNext, preloadPrev].forEach(idx => {
          const img = SM.slides[idx]?.el.querySelector("img");
          if (img?.dataset.fullSrc) {
              img.src = img.dataset.fullSrc;
              delete img.dataset.fullSrc; 
          }
      });

      SM.resetProgress(force);
    },
    
    next: (manual = false) => {
      const SM = window.SliderManager;
      if (STATE.isPausedByTitle && !manual) return;
      if (manual) { STATE.isPausedByTitle = false; SM.showArrows(); }
      
      const force = manual && !(!STATE.isTouchDevice && SM.container.matches(':hover'));
      SM.changeSlide((SM.index + 1) % SM.slides.length, force);
      if (manual && force) SM.resume();
    },
    
    prev: (manual = false) => {
      const SM = window.SliderManager;
      if (STATE.isPausedByTitle && !manual) return;
      if (manual) { STATE.isPausedByTitle = false; SM.showArrows(); }
      
      const force = manual && !(!STATE.isTouchDevice && SM.container.matches(':hover'));
      SM.changeSlide((SM.index - 1 + SM.slides.length) % SM.slides.length, force);
      if (manual && force) SM.resume();
    },
    
    pause: () => clearInterval(window.SliderManager.interval),
    
    resume: (force = false) => {
      const SM = window.SliderManager;
      SM.pause();
      if (!force && STATE.isPausedByTitle) return;
      
      const isPinned = SM.slides[SM.index]?.el.classList.contains('pinned-contain');
      const dur = isPinned ? CONFIG.sliderPinnedDuration : CONFIG.sliderNormalDuration;
      SM.interval = setTimeout(() => { SM.next(); SM.resume(); }, dur);
    },
    
    showArrows: () => {
      const SM = window.SliderManager;
      SM.container.classList.add('show-arrows');
      clearTimeout(SM.arrowTimeout);
      SM.arrowTimeout = setTimeout(() => SM.container.classList.remove('show-arrows'), 3000);
    },
    
    handleSwipe: () => {
      const SM = window.SliderManager;
      if (SM.touch.endX === 0) { STATE.wasDragged = false; return false; }
      
      const diffX = SM.touch.startX - SM.touch.endX;
      const diffY = SM.touch.startY - SM.touch.endY;
      let swiped = false;
      
      if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
        STATE.wasDragged = true; swiped = true;
        diffX > 0 ? SM.next(true) : SM.prev(true);
      } else {
        STATE.wasDragged = false;
      }
      
      SM.touch.endX = 0; SM.touch.endY = 0;
      return swiped;
    },

    setupEvents: () => {
      const SM = window.SliderManager;
      
      if (STATE.isTouchDevice || window.innerWidth <= 1468) {
        let hideTimer;
        const resetReactions = () => {
          clearTimeout(hideTimer);
          SM.container.querySelectorAll('.floating-reactions').forEach(r => r.classList.remove('hidden-reactions'));
          hideTimer = setTimeout(() => {
            SM.container.querySelectorAll('.floating-reactions').forEach(r => r.classList.add('hidden-reactions'));
          }, CONFIG.reactionHideDelay);
        };
        resetReactions();
        document.addEventListener('touchstart', resetReactions, PASSIVE);
      }

      // Κεντρικό έξυπνο Event Delegation που δεν προκαλεί lag
      SM.container.addEventListener('click', (e) => {
        if (STATE.wasDragged) {
          e.preventDefault(); e.stopPropagation();
          STATE.wasDragged = false;
          return;
        }

        const target = e.target.closest('.floating-btn, [data-action="zoom"], .slider-arrow, .snippet-btn');
        
        if (target) {
          e.preventDefault(); e.stopPropagation();
          
          if (target.classList.contains('floating-btn')) {
            ReactionsManager.handleVote(target);
          } 
          else if (target.dataset.action === 'zoom') {
            const slideObj = SM.slides.find(s => s.el === target.closest('.slide'));
            if (slideObj) LightboxManager.open(slideObj.imgs);
          } 
          else if (target.classList.contains('slider-arrow')) {
            SM.pause(); STATE.isPausedByTitle = false;
            target.dataset.action === 'prev-slide' ? SM.prev(true) : SM.next(true);
          } 
          else if (target.classList.contains('snippet-btn') && !target.classList.contains('disabled')) {
            const slideObj = SM.slides.find(s => s.el === target.closest('.slide'));
            if (!slideObj) return;

            const controls = target.closest('.snippet-pagination');
            const descEl = target.closest('.slide-desc-container').querySelector('.slide-desc');
            let curr = parseInt(controls.dataset.current, 10);
            
            if (target.dataset.action === 'prev-snippet' && curr > 0) curr--;
            else if (target.dataset.action === 'next-snippet' && curr < slideObj.chunks.length - 1) curr++;
            
            controls.dataset.current = curr;
            Utils.buildSafeTextNodes(slideObj.chunks[curr], descEl);
            controls.querySelector('[data-action="prev-snippet"]').classList.toggle('disabled', curr === 0);
            controls.querySelector('[data-action="next-snippet"]').classList.toggle('disabled', curr === slideObj.chunks.length - 1);
          }
          return;
        }

        const caption = e.target.closest('.slide-title');
        if (caption && (STATE.isTouchDevice || window.innerWidth <= 868)) {
          if (!STATE.isPausedByTitle) {
            e.preventDefault(); e.stopPropagation();
            STATE.isPausedByTitle = true;
            SM.pause();
            if (SM.progressBar) {
                SM.progressBar.style.transition = 'none';
                SM.progressBar.style.width = '100%';
            }
          }
        }
      }, true);

      document.addEventListener('click', (e) => {
        if (STATE.isPausedByTitle && !e.target.closest('.slide-title')) {
          STATE.isPausedByTitle = false;
          SM.resetProgress(true);
          SM.resume();
        }
      });

      const trigArr = Utils.throttle(() => SM.showArrows(), 500);
      window.addEventListener('scroll', trigArr, PASSIVE);
      ['mousedown', 'touchstart'].forEach(evt => document.addEventListener(evt, (e) => { if (!e.target.closest('.slider-arrow')) trigArr(); }, PASSIVE));
      document.addEventListener('mousemove', () => { if (!STATE.isTouchDevice) trigArr(); }, PASSIVE);

      SM.container.addEventListener('mouseenter', () => {
        if (STATE.isTouchDevice) return;
        SM.pause(); SM.showArrows();
        if (SM.progressBar) { SM.progressBar.style.transition = 'none'; SM.progressBar.style.width = '0%'; }
      });

      SM.container.addEventListener('mouseleave', () => {
        if (STATE.isTouchDevice || document.body.classList.contains('lb-active')) return;
        if (STATE.isDragging) {
          STATE.isDragging = false;
          const swiped = SM.handleSwipe();
          if (!STATE.isPausedByTitle) { SM.resume(); if (!swiped) SM.resetProgress(); }
        } else if (!STATE.isPausedByTitle) {
          SM.resume(); SM.resetProgress();
        }
      });

      SM.container.addEventListener('touchstart', e => {
        if (e.target.closest('.slide-desc-container')) return; 
        STATE.isTouchDevice = true; STATE.wasDragged = false;
        SM.touch.startX = e.touches[0].clientX; SM.touch.startY = e.touches[0].clientY;
        SM.touch.endX = 0; SM.touch.endY = 0;
        SM.showArrows(); SM.pause();
        if (SM.progressBar) { SM.progressBar.style.transition = 'none'; SM.progressBar.style.width = '0%'; }
      }, PASSIVE);

      SM.container.addEventListener('touchmove', e => { 
        SM.touch.endX = e.touches[0].clientX; 
        SM.touch.endY = e.touches[0].clientY; 
      }, PASSIVE);
      
      SM.container.addEventListener('touchend', e => {
        if (e.target.closest('.slide-desc-container')) return;
        SM.handleSwipe();
        if (!STATE.isPausedByTitle) { SM.resume(); SM.resetProgress(true); }
      });

      SM.container.addEventListener('mousedown', e => {
        if (e.button !== 0 || STATE.isTouchDevice || e.target.closest('.slide-desc-container')) return;
        STATE.isPausedByTitle = false; STATE.wasDragged = false; STATE.isDragging = true;
        SM.touch.startX = e.clientX; SM.touch.startY = e.clientY;
        SM.touch.endX = 0; SM.touch.endY = 0;
        SM.pause(); 
        if (SM.progressBar) { SM.progressBar.style.transition = 'none'; SM.progressBar.style.width = '0%'; }
      });

      SM.container.addEventListener('mousemove', e => { 
        if (STATE.isDragging) { SM.touch.endX = e.clientX; SM.touch.endY = e.clientY; } 
      });
      
      SM.container.addEventListener('mouseup', () => {
        if (!STATE.isDragging) return;
        STATE.isDragging = false;
        const swiped = SM.handleSwipe();
        const hover = SM.container.matches(':hover');
        if (!hover) SM.resume();
        if (swiped) SM.resetProgress(!hover);
        else if (!hover) SM.resetProgress();
      });

      document.addEventListener('keydown', e => {
        if (document.body.classList.contains('lb-active')) return;
        const rect = SM.container.getBoundingClientRect();
        if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
          if (e.key === 'ArrowLeft') { e.preventDefault(); SM.prev(true); }
          else if (e.key === 'ArrowRight') { e.preventDefault(); SM.next(true); }
        }
      });
    }
  };

  // ==========================================
  // 7. ΕΝΑΡΞΗ ΛΕΙΤΟΥΡΓΙΩΝ
  // ==========================================
  document.addEventListener('DOMContentLoaded', () => {
    NavManager.init();
    LightboxManager.init();
    window.SliderManager?.init();
  });

})();

(() => {

document.addEventListener("DOMContentLoaded", () => {
  (async function initNewsTicker() {
    // 1. Ρυθμίσεις (Εύκολη διαχείριση στο μέλλον)
    const config = {
      blogUrl: "https://dimperist.blogspot.com",
      maxPosts: 6,
      containerId: "ticker-scroll",
      fallbackLink: "#"
    };

    // 2. Έλεγχος ύπαρξης στοιχείου ΠΡΙΝ το request (Εξοικονόμηση πόρων)
    const tickerContainer = document.getElementById(config.containerId);
    if (!tickerContainer) return;

    try {
      // 3. Σύγχρονο Fetch API με async/await
      const feedUrl = `${config.blogUrl}/feeds/posts/default?alt=json&max-results=${config.maxPosts}`;
      const response = await fetch(feedUrl);
      
      // 4. Σωστός έλεγχος δικτύου (Το fetch δεν πιάνει τα 404/500 από μόνο του)
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const data = await response.json();
      
      // 5. Ασφαλής προσπέλαση δεδομένων (Optional Chaining '?')
      const entries = data?.feed?.entry;

      if (!entries || !entries.length) {
        tickerContainer.textContent = "Δεν βρέθηκαν αναρτήσεις.";
        return;
      }

      // 6. Επιδόσεις: Χρήση DocumentFragment (Αποτρέπει τα DOM reflows)
      const fragment = document.createDocumentFragment();

      entries.forEach(entry => {
        const title = entry.title?.$t || "Χωρίς τίτλο";
        const altLink = entry.link?.find(l => l.rel === "alternate");
        const linkHref = altLink?.href || config.fallbackLink;

        // 7. Απόλυτη Ασφάλεια XSS: Χρήση createElement & textContent αντί για innerHTML
        const anchor = document.createElement("a");
        anchor.href = linkHref;
        anchor.className = "ticker-link";
        anchor.textContent = title; 

        fragment.appendChild(anchor);
      });

      // 8. Διπλασιασμός στοιχείων για το CSS εφέ της αδιάκοπης κύλισης
      const clonedFragment = fragment.cloneNode(true);

      // 9. Προσβασιμότητα (Accessibility & SEO): Κρύβουμε τα διπλότυπα
      clonedFragment.querySelectorAll("a").forEach(anchor => {
        anchor.setAttribute("aria-hidden", "true");
        anchor.setAttribute("tabindex", "-1");
      });

      // 10. Ταχύτατη και σύγχρονη εισαγωγή στο DOM
      tickerContainer.replaceChildren(fragment, clonedFragment);

    } catch (error) {
      console.error("News Ticker Error:", error);
      // Προαιρετικό fallback σε περίπτωση που πέσει το Blogger API
      // tickerContainer.textContent = "Προσωρινή αδυναμία φόρτωσης ειδήσεων.";
    }
  })();
});

})();

(() => {
document.addEventListener("DOMContentLoaded", () => {
  "use strict"; // Αυστηρή λειτουργία για μέγιστη απόδοση και αποφυγή σιωπηλών λαθών

  /* ========================================================================
     1. ΡΥΘΜΙΣΕΙΣ (DATA-DRIVEN ARCHITECTURE)
     Όλη η λογική βρίσκεται εδώ. Αν στο μέλλον θες να βάλεις 2ο κουμπί 
     στη "Βιβλιοθήκη", απλώς προσθέτεις το "secondaryBtn". Ο κώδικας δεν πειράζεται!
     ======================================================================== */
  const modalData = {
    "Τμήματα": { 
      icon: "🏫✨", 
      text: "Καλώς ήρθατε! Περιηγηθείτε στα μονοπάτια της ιστορίας του σχολείου, του χωριού μας και της Πιερίας μέσα από τους χάρτες και όχι μόνο! Πατήστε τον παρακάτω σύνδεσμο για να ξεκινήσετε την εξερεύνηση!",
      primaryBtn: "Δείτε εδώ 🚀"
    },
    "Μαθητές/τριες": { 
      icon: "👧👦🌟", 
      text: "Εδώ θα ανακαλύψετε όλες τις δράσεις, γιορτές και δραστηριότητες των παιδιών. Δείτε τις δημιουργίες τους!",
      primaryBtn: "Δείτε εδώ 🚀"
    },
    "Εκπαιδευτικοί": { 
      icon: "👩‍🏫👨‍🏫💡", 
      text: "Γνωρίστε το προσωπικό του σχολείου και διαβάστε χρήσιμα άρθρα για το σχολείο, την υγεία, την ψυχολογία και το παιχνίδι.",
      primaryBtn: "Εκπαιδευτικοί 👩‍🏫",
      secondaryBtn: { text: "Άρθρα 📖", url: "https://dimperist.blogspot.com/p/blog-page_89.html" } // <-- Το 2ο κουμπί ορίζεται εδώ δυναμικά!
    },
    "Βιβλιοθήκη": { 
      icon: "📚🪄", 
      text: "Ταξιδέψτε στον μαγικό κόσμο των βιβλίων! Επισκεφθείτε τη σχολική βιβλιοθήκη, βρείτε νέους θησαυρούς και αγαπήστε το διάβασμα.",
      primaryBtn: "Δείτε εδώ 🚀"
    },
    "Υλικό": { 
      icon: "📝🦉", 
      text: "Ένας θησαυρός γνώσης! Βρείτε χρήσιμο εκπαιδευτικό υλικό, σημειώσεις και βοηθήματα για όλες τις τάξεις. Εξερευνήστε το υλικό μας!",
      primaryBtn: "Δείτε εδώ 🚀"
    }
  };

  /* ========================================================================
     2. ΜΕΤΡΗΤΕΣ (COUNTERS) - ΒΕΛΤΙΣΤΟΠΟΙΗΣΗ ΑΠΟΔΟΣΗΣ (60 FPS)
     ======================================================================== */
  const initCounters = () => {
    const counters = document.querySelectorAll('.stat-number');
    if (!counters.length) return;

    // Το textContent είναι πολύ πιο γρήγορο από το innerText γιατί αποφεύγει το CSS Reflow του Browser
    counters.forEach(c => c.textContent = "0"); 
    
    const easeOutSeptic = t => 1 - Math.pow(1 - t, 7);

    const animateCounters = (entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const targetElement = entry.target;
        // Ασφαλής ανάγνωση δεδομένων με fallback (|| 0)
        const targetNum = parseInt(targetElement.getAttribute('data-target'), 10) || 0;
        const customSpeed = parseInt(targetElement.getAttribute('data-speed'), 10) || 50;
        
        // Ορίζουμε όρια (Ελάχιστο 1s - Μέγιστο 3s). 
        // Προστατεύει αν βάλεις έναν τεράστιο αριθμό (π.χ. 50.000) από το να μετράει ατελείωτα.
        const calculatedDuration = (targetNum * (1000 / customSpeed)) * 1.5;
        const duration = Math.max(1000, Math.min(calculatedDuration, 3000));
        
        let startTime = null;

        const updateCount = (currentTime) => {
          if (!startTime) startTime = currentTime;
          const progress = duration > 0 ? Math.min((currentTime - startTime) / duration, 1) : 1;
          
          if (progress < 1) {
            targetElement.textContent = Math.floor(targetNum * easeOutSeptic(progress));
            requestAnimationFrame(updateCount); 
          } else {
            targetElement.textContent = targetNum; // Εξασφάλιση απόλυτης ακρίβειας στο τέλος
          }
        };

        if (targetNum > 0) requestAnimationFrame(updateCount); 
        observer.unobserve(targetElement); // Σταματάμε την παρακολούθηση της κάρτας για εξοικονόμηση μνήμης RAM
      });
    };

    // Μικρότερο threshold (0.2) για καλύτερη απόκριση στο scroll στα κινητά (στις μεγάλες κάρτες)
    const observer = new IntersectionObserver(animateCounters, { threshold: 0.2 });
    counters.forEach(counter => observer.observe(counter));
  };

  /* ========================================================================
     3. MODAL (UI, UX, ACCESSIBILITY & BULLETPROOFING)
     ======================================================================== */
  const initModal = () => {
    const modalOverlay = document.getElementById('glassModal');
    if (!modalOverlay) return; // Fail-safe: Αν λείπει το Modal από μια σελίδα, ο κώδικας δεν κρασάρει ποτέ!

    // Η ΛΥΣΗ ΓΙΑ ΤΟ Z-INDEX: Μεταφορά στο <body>
    document.body.appendChild(modalOverlay);

    // Caching: Βρίσκουμε τα στοιχεία 1 φορά (ο παλιός κώδικας έψαχνε το modalBtn2 σε κάθε κλικ!)
    const modalIcon = document.getElementById('modalIcon');
    const modalText = document.getElementById('modalText');
    const modalBtn = document.getElementById('modalBtn');
    const modalBtn2 = document.getElementById('modalBtn2');
    
    let lastFocusedElement = null; // Για Προσβασιμότητα (Accessibility)

    const openModal = (label, url, triggerElement) => {
      const data = modalData[label];
      if (!data) return;

      lastFocusedElement = triggerElement;

      // Εισαγωγή Δεδομένων με textContent (Αποτρέπει κακόβουλες επιθέσεις XSS)
      if (modalIcon) modalIcon.innerHTML = data.icon; 
      if (modalText) modalText.innerHTML = data.text;

      // Ρύθμιση 1ου Κουμπιού
      if (modalBtn) {
        modalBtn.setAttribute('href', url || '#');
        modalBtn.innerHTML = data.primaryBtn || "Δείτε εδώ 🚀";
      }

      // Ρύθμιση 2ου Κουμπιού (Δυναμικά)
      if (modalBtn2) {
        if (data.secondaryBtn) {
          modalBtn2.setAttribute('href', data.secondaryBtn.url);
          modalBtn2.innerHTML = data.secondaryBtn.text;
          modalBtn2.style.display = 'inline-block';
        } else {
          modalBtn2.style.display = 'none';
        }
      }

      modalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden'; // [Premium UX]: Κλειδώνει το scroll της πίσω σελίδας (Τέλειο για κινητά)
      
      // Accessibility: Πάει αυτόματα το Focus στο 1ο κουμπί
      setTimeout(() => modalBtn?.focus(), 50);
    };

    const closeModal = () => {
      modalOverlay.classList.remove('active');
      document.body.style.overflow = ''; // Ξεκλειδώνει το scroll
      if (lastFocusedElement) lastFocusedElement.focus(); // Επιστρέφει το focus στην κάρτα που είχε πατηθεί
    };

    // Εξαγωγή για inline onclick="..." (αν υπάρχει στο HTML σου)
    window.closeGlassModal = closeModal;

    // Κλείσιμο με κλικ στο σκοτεινό φόντο
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    // [ΝΕΟ] Κλείσιμο με το πλήκτρο ESC (Standard Web Practice)
    document.addEventListener('keydown', (e) => {
      if (e.key === "Escape" && modalOverlay.classList.contains('active')) closeModal();
    });

    // EVENT DELEGATION: Ένας ακροατής (listener) στο document, αντί για πολλούς (Μέγιστη ταχύτητα)
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.stat-glass-card, .stat-link');
      if (!card) return;

      const url = card.getAttribute('href');
      // Αγνοούμε τις κάρτες χωρίς href (επιτρέπουμε την κανονική τους συμπεριφορά)
      if (card.classList.contains('stat-glass-card') && (!url || url === '#')) return;

      e.preventDefault(); 
      
      // Optional Chaining (?.) για αποφυγή σφαλμάτων (errors)
      const label = card.querySelector('.stat-label')?.textContent.trim() || "";
      if (modalData[label]) openModal(label, url, card);
    });
  };

  // Εκκίνηση Εφαρμογής (Οργάνωση σε Functions για καθαρότερη μνήμη)
  initCounters();
  initModal();
});
})();

(() => {
    "use strict";

    const NewsletterManager = {
        init: () => {
            const path = window.location.pathname;
            
            // 1. Guard Clause (Αν δεν είμαστε στην αρχική, σταμάτα αμέσως)
            if (path !== '/' && path !== '/index.html') return;

            // 2. Optional Chaining (Βρες το και αν υπάρχει, βάλε την κλάση)
            const wrapper = document.getElementById('mobile-newsletter-wrapper');
            wrapper?.classList.add('show-on-home');
        }
    };

    // 3. Bulletproof Φόρτωση (Τρέχει σωστά όπου κι αν το βάλεις)
    if (document.readyState === "loading") {
        document.addEventListener('DOMContentLoaded', NewsletterManager.init);
    } else {
        NewsletterManager.init();
    }
})();

(() => {
  "use strict";

  // --- CONFIGURATION ---
  const CONFIG = Object.freeze({
    loopModes: ['Κλειστή', 'Όλη η λίστα', 'Ένα τραγούδι'],
    loopClasses: ['loop-btn', 'loop-btn active-loop-all', 'loop-btn active-loop-one'],
    icons: ['🔁', '🔁', '🔂']
  });

  const STATE = {
    loopModeIndex: 1 // Ξεκινάει με 1 (Όλη η λίστα)
  };

  // --- JUKEBOX MANAGER ---
  const JukeboxManager = {
    player: document.getElementById('main-juke-player'),
    source: document.getElementById('juke-audio-source'),
    display: document.getElementById('juke-track-display'),
    wrapper: document.getElementById('extra-tracks-wrapper'),
    loopBtn: document.getElementById('loop-btn'),
    moreBtn: document.getElementById('toggle-more-btn'),

    init: () => {
      const JM = JukeboxManager;
      if (!JM.player) return; // Αν λείπει το HTML, σταματάει ήσυχα

      // Event για όταν τελειώνει το τραγούδι
      JM.player.addEventListener('ended', JM.handleTrackEnd);
      
      // Κλικ στο κουμπί της επανάληψης
      if (JM.loopBtn) {
        JM.loopBtn.addEventListener('click', JM.toggleLoop);
      }

      // Κλικ στο κουμπί "Περισσότερα"
      if (JM.moreBtn) {
        JM.moreBtn.addEventListener('click', (e) => {
          e.stopPropagation(); // Αποτρέπει το κλείσιμο του μενού αμέσως
          JM.wrapper.classList.toggle('open');
        });
      }

      // Event Delegation: Ένας "έξυπνος" ακροατής για όλα τα κλικ
      document.addEventListener('click', JM.handleGlobalClick);
    },

    playTrack: (button, url, name) => {
      const JM = JukeboxManager;
      
      JM.player.pause();
      JM.source.src = url;
      JM.player.load();
      
      JM.player.play().catch(err => {
         console.warn("Η αυτόματη αναπαραγωγή μπλοκαρίστηκε από τον browser.");
      });
      
      JM.display.innerText = name;
      
      // Καθαρίζουμε το active class από όλα και το βάζουμε σε αυτό που πατήθηκε
      document.querySelectorAll('.playlist-btn, .extra-track-btn').forEach(btn => btn.classList.remove('track-active'));
      button.classList.add('track-active');
    },

    toggleLoop: () => {
      STATE.loopModeIndex = (STATE.loopModeIndex + 1) % 3;
      const idx = STATE.loopModeIndex;
      
      JukeboxManager.loopBtn.innerText = `${CONFIG.icons[idx]} Επανάληψη: ${CONFIG.loopModes[idx]}`;
      JukeboxManager.loopBtn.className = CONFIG.loopClasses[idx];
    },

    handleTrackEnd: () => {
      const JM = JukeboxManager;
      
      if (STATE.loopModeIndex === 2) {
        // Επανάληψη ίδιου τραγουδιού
        JM.player.currentTime = 0;
        JM.player.play();
      } else if (STATE.loopModeIndex === 1) {
        // Επανάληψη όλης της λίστας - Ψάχνει μόνο όσα έχουν data-url
        const allBtns = Array.from(document.querySelectorAll('.playlist-btn[data-url], .extra-track-btn[data-url]'));
        const activeBtn = document.querySelector('.track-active');
        
        if (!activeBtn || allBtns.length === 0) return;

        let nextIndex = (allBtns.indexOf(activeBtn) + 1) % allBtns.length;
        
        // Έλεγχος για το αν το επόμενο κουμπί έχει αληθινό link (π.χ. περιέχει 'http')
        let attempts = 0;
        while (attempts < allBtns.length) {
          const nextUrl = allBtns[nextIndex].dataset.url || "";
          if (nextUrl.includes('http')) {
            allBtns[nextIndex].click(); // Αναπαραγωγή επόμενου
            break;
          }
          nextIndex = (nextIndex + 1) % allBtns.length;
          attempts++;
        }
      }
    },

    handleGlobalClick: (e) => {
      const JM = JukeboxManager;
      
      // 1. Έλεγχος αν πατήθηκε κάποιο τραγούδι
      const trackBtn = e.target.closest('[data-url]');
      if (trackBtn) {
        const url = trackBtn.dataset.url;
        const name = trackBtn.dataset.name;
        if (url && name) {
          JM.playTrack(trackBtn, url, name);
        }
        return; // Βγαίνουμε, δεν χρειάζεται να ελέγξουμε κάτι άλλο
      }

      // 2. Λογική για το κλείσιμο του "Περισσότερα" όταν πατάμε αλλού
      if (JM.wrapper && JM.wrapper.classList.contains('open')) {
         if (!JM.wrapper.contains(e.target) && (!JM.moreBtn || !JM.moreBtn.contains(e.target))) {
           JM.wrapper.classList.remove('open');
         }
      }
    }
  };

  // Εκκίνηση μόλις φορτώσει το HTML
  document.addEventListener('DOMContentLoaded', JukeboxManager.init);

})();

(() => {
  "use strict";

  // ==========================================
  // 1. CONFIGURATION (Ρυθμίσεις & Δεδομένα)
  // ==========================================
  const CONFIG = Object.freeze({
    schedule: [
      { start: "08:15", end: "09:00", name: "1η Διδακτική", type: "class", nextIsBreak: false },
      { start: "09:00", end: "09:40", name: "2η Διδακτική", type: "class", nextIsBreak: true },
      { start: "09:40", end: "10:00", name: "1ο Διάλειμμα", type: "break" },
      { start: "10:00", end: "10:45", name: "3η Διδακτική", type: "class", nextIsBreak: false },
      { start: "10:45", end: "11:30", name: "4η Διδακτική", type: "class", nextIsBreak: true },
      { start: "11:30", end: "11:45", name: "2ο Διάλειμμα", type: "break" },
      { start: "11:45", end: "12:25", name: "5η Διδακτική", type: "class", nextIsBreak: false },
      { start: "12:25", end: "12:35", name: "3ο Διάλειμμα", type: "break" },
      { start: "12:35", end: "13:15", name: "6η Διδακτική", type: "class", nextIsBreak: true }
    ],
    timeThresholds: {
      afternoon: 13 * 60 + 15, // 13:15 (795 λεπτά)
      evening: 17 * 60,        // 17:00 (1020 λεπτά)
      nightStart: 21,          // 21:00
      nightEnd: 8              // 08:00
    },
    // ΕΔΩ ΒΑΖΕΙΣ ΤΑ ΔΙΚΑ ΣΟΥ ΜΗΝΥΜΑΤΑ (Τη βάση δεδομένων σου)
    radarMessages: {
      class: [
    "Εξηγούν το μάθημα, ενώ κάποιος ρωτάει: 'Κύριε, πότε χτυπάει;' ⏳",
    "Γράφουν στον πίνακα και μαντεύουν ποιος ψιθυρίζει στο τρίτο θρανίο! 👀",
    "Μοιράζουν απλόχερα γνώση... και ίσως καμιά εργασία για το σπίτι! 📝",
    "Βοηθούν να λυθεί εκείνη η δύσκολη άσκηση πριν τελειώσει η ώρα! 🔢",
    "Κάνουν ερωτήσεις και χαίρονται όταν βλέπουν όλα τα χέρια ψηλά! 🙋‍♂️🙋‍♀️",
    "Ακούνε την κλασική δικαιολογία: 'Κύριε, το τετράδιο το ξέχασα στο σπίτι!' 📓🤷‍♂️",
    "Προσπαθούν να εξηγήσουν τη θεωρία ενώ κάποιος ξύνει το μολύβι του με τις ώρες! ✏️🗑️",
    "Ανοίγουν το παράθυρο για να μπει λίγος αέρας και να ξυπνήσουν οι πίσω σειρές! 🪟💨",
"Παρατηρούν ότι όλη η τάξη κοιτάζει το ρολόι, οπότε λένε: 'Αφήστε το, θα το συνεχίσουμε αύριο!' ⌚",
    "Μοιράζουν φωτοτυπίες και εύχονται να μην μπερδευτούν τα χαρτιά πάνω στα θρανία! 📄",
    "Επιβραβεύουν την προσπάθεια της τάξης και χαμογελούν με ένα αστείο που είπε μία συμμαθήτρια! 😊"
],
      break: ["Εφημερία στην αυλή: Κάνουν τον διαιτητή, τον νοσοκόμο και τον ειρηνοποιό! ⚽🩹",
    "Τρέχουν στο γραφείο για φωτοτυπίες σε χρόνο ρεκόρ! 🖨️🏃‍♂️",
    "Προσπαθούν να φάνε το κολατσιό τους πριν ακουστεί πάλι το κουδούνι! 🥪🔔",
    "Αναζητούν 5 λεπτά ησυχίας, αλλά η αυλή έχει 100 ντεσιμπέλ! 📢",
    "Πίνουν δύο γουλιές καφέ και αμέσως τους φωνάζουν: 'Κυρία, ο Γιώργος με έσπρωξε!' ☕🏃‍♀️",
    "Κάνουν βόλτες στους διαδρόμους για να βεβαιωθούν ότι κανείς δεν τρέχει επικίνδυνα! 🏃‍♂️🚫",
    "Κοιτάζουν το ρολόι και αναρωτιούνται πώς πέρασαν κιόλας αυτά τα 15 λεπτά! 🕒🤯",
"Μαζεύουν τις μπάλες που έφυγαν κατά λάθος από το γήπεδο και έπεσαν στα λουλούδια! ⚽🌸",
    "Προσπαθούν να πείσουν τους μαθητές να μπουν στην τάξη, ενώ εκείνοι θέλουν 'μόνο 1 λεπτό ακόμα'! 🏃‍♂️",
    "Συζητούν με συναδέλφους για το πόσο γρήγορα περνάει η μέρα στο σχολείο! 🗣️"
],
      afternoon: ["Επιστρέφουν σπίτι, τρώνε και ελπίζουν να μην έχουν πολλά τετράδια για διόρθωμα! 🍝🙏",
    "Κάνουν ένα μικρό διάλειμμα για ξεκούραση πριν την προετοιμασία της αυριανής μέρας. 🛋️",
    "Πίνουν τον απογευματινό καφέ τους προσπαθώντας να θυμηθούν πού έβαλαν τους μαρκαδόρους! ☕💭",
    "Σκέφτονται ποιοι μαθητές χρειάζονται λίγη παραπάνω βοήθεια ή ενθάρρυνση αύριο. 🧠❤️",
    "Απολαμβάνουν λίγη απόλυτη ησυχία πριν ξεκινήσει ο επόμενος γύρος υποχρεώσεων. 🧘‍♂️✨",
"Προγραμματίζουν τις δράσεις της επόμενης σχολικής γιορτής στον υπολογιστή! 🎭",
    "Καθαρίζουν το γραφείο τους από τα χαρτιά της ημέρας για να είναι έτοιμοι για αύριο! 🧹"],
      evening: ["Διορθώνουν τετράδια με το κόκκινο στιλό και πολλή υπομονή... 📝🖍️",
    "Ψάχνουν στο ίντερνετ έξυπνες ιδέες για να σας κάνουν το αυριανό μάθημα πιο ωραίο! 💻💡",
    "Φτιάχνουν το πρόγραμμα της επόμενης μέρας και ετοιμάζουν την τσάντα τους. 📋🎒",
    "Συμπληρώνουν βαθμολογίες, απουσίες και γράφουν παρατηρήσεις με πολλή προσοχή. 📊🖋️",
    "Απαντούν σε email γονέων και οργανώνουν τις αυριανές παρουσιάσεις. 💻📧",
    "Κλείνουν επιτέλους τα βιβλία για να δουν λίγη τηλεόραση ή να χαλαρώσουν. 📺📚",
"Προετοιμάζουν το ψηφιακό υλικό για την αυριανή διδασκαλία στον υπολογιστή! 🖱️",
    "Αναρωτιούνται αν οι μαθητές θα καταλάβουν την έκπληξη που τους ετοιμάζουν! 🎁",
    "Βάζουν τάξη στις σημειώσεις τους για να μην ψάχνονται αύριο το πρωί! 📂"],
      night: ["Σσσς! Οι δάσκαλοι κοιμούνται. Φορτίζουν τη μπαταρία τους στο 100% για αύριο! 😴🔋",
    "Ονειρεύονται μια τάξη που όλοι κάθονται ήσυχα... (Μάλλον επιστημονική φαντασία!) 🌌🛌",
    "Ανακτούν δυνάμεις για να αντιμετωπίσουν αύριο πάλι τα 'ξεχασμένα' τετράδια! 🌙💤",
    "Το μυαλό τους πάει για ύπνο, αλλά η αυριανή εισαγωγή στο μάθημα παίζει ακόμα στο repeat! 🧠🔄",
    "Κλειστά κινητά, κλειστά βιβλία, ώρα για την απαραίτητη νυχτερινή ξεκούραση. 🛌🌟",
"Ξεχνάνε το ξυπνητήρι... αλλά το σχολικό άγχος τους ξυπνάει πριν από αυτό! ⏰",
    "Προσπαθούν να θυμηθούν αν έκλεισαν τα φώτα στην τάξη! 💡",
    "Απολαμβάνουν το όνειρο ότι το κουδούνι δεν χτύπησε ποτέ! 🔔💤"],
      weekend: ["Αποτοξίνωση από το κουδούνι! Έχουν βάλει το ξυπνητήρι στο αθόρυβο. 🔕🛋️",
    "Ξεκουράζουν τη φωνή τους, γιατί από Δευτέρα έχει πάλι ομιλία και φασαρία! 🤫🎶",
    "Προσπαθούν να μην σκεφτούν το σχολείο... αλλά σίγουρα θυμούνται αστεία σας! 🚲🌳",
    "Βγαίνουν για μια βόλτα ή έναν καφέ με φίλους, χωρίς να ακούνε φωνές και τρεχαλητά! 🏙️☕",
    "Κάνουν τα ψώνια της εβδομάδας, βλέπουν τις οικογένειές τους και γεμίζουν μπαταρίες. 🛒☀️",
"Πηγαίνουν μια βόλτα στη φύση για να ξεχάσουν το 'Κυρία, ο Γιώργος...' 🌿",
    "Διαβάζουν ένα βιβλίο που δεν έχει καμία σχέση με σχολικό εγχειρίδιο! 📖",
    "Απολαμβάνουν τον ύπνο της Κυριακής μέχρι αργά, χωρίς να ανησυχούν για την 1η ώρα! 😴"
],
      holiday: ["Λειτουργία 'Μην Ενοχλείτε'. Η μπαταρία γεμίζει... Τα λέμε όταν ανοίξουν τα σχολεία! 🏖️🍹",
    "Χωρίς ξυπνητήρια, χωρίς προγράμματα! Απολαμβάνουν ελεύθερο χρόνο και ηρεμία. 🌅🕶️",
    "Αδειάζουν το μυαλό τους από τις ασκήσεις και γεμίζουν με όμορφες στιγμές ξεγνοιασιάς! 🍉🏕️",
    "Ταξιδεύουν, ξεκουράζονται και ξεχνούν για λίγο τι σημαίνει 'ώρα για μάθημα'! ✈️🌍",
"Εξερευνούν μέρη που δεν έχουν 'μαθητές' να τους ρωτάνε 'Τι ώρα φεύγουμε;' 🗺️",
    "Ετοιμάζουν τη βαλίτσα τους και αφήνουν τα τετράδια στο κάτω ράφι! 🧳",
    "Απολαμβάνουν τον ήλιο και τη θάλασσα, μακριά από τον πίνακα και τον μαρκαδόρο! 🌊"]
    }
  });

  const STATE = {
    isShowingRadar: false,
    radarTimeout: null,
    usedMessages: {}
  };

  // Cached DOM Elements (Για μέγιστη ταχύτητα, δεν ψάχνουμε το DOM συνέχεια)
  const DOM = {
    mainEl: null,
    subEl: null,
    progBg: null,
    progFill: null,
    liveDot: null,
    trackerTitle: null,
    trackerBox: null
  };

  // ==========================================
  // 2. UTILS (Βοηθητικές Συναρτήσεις)
  // ==========================================
  const Utils = {
    timeToMins: (timeStr) => {
      const [hours, minutes] = timeStr.split(":");
      return parseInt(hours, 10) * 60 + parseInt(minutes, 10);
    },

    getHolidayStatus: (now) => {
      const year = now.getFullYear(), month = now.getMonth(), date = now.getDate(), timestamp = now.getTime();

      // Σταθερές Αργίες
      if (month === 9 && date === 28) return { main: "28η Οκτωβρίου 🇬🇷", sub: "Ζήτω η 28η Οκτωβρίου! Το σχολείο είναι κλειστό." };
      if (month === 10 && date === 17) return { main: "17η Νοεμβρίου 🎗️", sub: "Επέτειος Πολυτεχνείου. Ημέρα μνήμης." };
      if (month === 2 && date === 25) return { main: "25η Μαρτίου 🇬🇷", sub: "Ζήτω η 25η Μαρτίου! Χρόνια Πολλά!" };
      if (month === 4 && date === 1) return { main: "Πρωτομαγιά 🌺", sub: "Καλό μήνα! Το σχολείο είναι κλειστό σήμερα." };

      // Χριστούγεννα & Καλοκαίρι
      if ((month === 11 && date >= 24) || (month === 0 && date <= 7)) return { main: "Καλά Χριστούγεννα! 🎄✨", sub: "Καλές γιορτές και ευτυχισμένο το νέο έτος!" };
      if ((month === 5 && date >= 16) || month === 6 || month === 7 || (month === 8 && date <= 10)) return { main: "Καλό Καλοκαίρι! ☀️⛱️", sub: "Ραντεβού τον Σεπτέμβριο! Καλές βουτιές!" };

      // Υπολογισμός Πάσχα (Meeus/Gauss)
      const a = year % 19, b = year % 4, c = year % 7;
      const d = (19 * a + 15) % 30, e = (2 * b + 4 * c + 6 * d + 6) % 7;
      let pDay = 22 + d + e + 13, pMonth = 3;
      if (pDay > 31) { pDay -= 31; pMonth = 4; if (pDay > 30) { pDay -= 30; pMonth = 5; } }
      
      const easterSunday = new Date(year, pMonth - 1, pDay, 0, 0, 0);
      const easterStart = easterSunday.getTime() - 6 * 86400000; // Μεγάλη Δευτέρα
      const easterEnd = easterSunday.getTime() + 7 * 86400000 + 86399000; // Κυριακή Θωμά 23:59:59

      if (timestamp >= easterStart && timestamp <= easterEnd) return { main: "Καλό Πάσχα! 🐣🌷", sub: "Το σχολείο είναι κλειστό για τις διακοπές του Πάσχα." };

      const cleanMonday = new Date(easterSunday.getTime() - 48 * 86400000);
      if (date === cleanMonday.getDate() && month === cleanMonday.getMonth()) return { main: "Καθαρά Δευτέρα 🪁", sub: "Καλά Κούλουμα! Το σχολείο είναι κλειστό." };

      const holySpirit = new Date(easterSunday.getTime() + 50 * 86400000);
      if (date === holySpirit.getDate() && month === holySpirit.getMonth()) return { main: "Αγίου Πνεύματος 🙏", sub: "Τριήμερο Αγίου Πνεύματος. Το σχολείο είναι κλειστό." };

      return null;
    }
  };

  // ==========================================
  // 3. APP MANAGER (Λογική Συστήματος)
  // ==========================================
  const AppManager = {
    init: () => {
      // Βρίσκουμε το DOM ΜΟΝΟ μία φορά
      DOM.mainEl = document.getElementById("bell-main");
      DOM.subEl = document.getElementById("bell-sub");
      DOM.progBg = document.getElementById("bell-progress-bg");
      DOM.progFill = document.getElementById("bell-progress-fill");
      DOM.liveDot = document.getElementById("liveDot");
      DOM.trackerTitle = document.getElementById("trackerTitle");
      DOM.trackerBox = document.getElementById('bellTracker');

      if (!DOM.mainEl) return; // Αν δεν υπάρχει το HTML, σταμάτα.

      AppManager.updateTracker();
      setInterval(AppManager.updateTracker, 60000);

      // Radar Events
      if (DOM.trackerBox) {
        DOM.trackerBox.style.cursor = 'pointer';
        DOM.trackerBox.addEventListener('click', AppManager.handleRadarTrigger);
      }

      document.addEventListener('click', AppManager.handleGlobalClick);
    },

    updateTracker: () => {
      if (STATE.isShowingRadar) return; // Μην κάνεις update αν παίζει το ραντάρ

      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const day = now.getDay();
      
      DOM.subEl.style.color = "";
      DOM.progBg.style.display = "none";
      DOM.liveDot.classList.remove("paused");
      DOM.trackerTitle.innerHTML = "Live Ωράριο";

      // 1. Αργίες
      const holiday = Utils.getHolidayStatus(now);
      if (holiday) {
        DOM.mainEl.innerHTML = holiday.main;
        DOM.mainEl.style.color = "#a90e0e";
        DOM.subEl.innerHTML = holiday.sub;
        DOM.liveDot.classList.add("paused");
        DOM.trackerTitle.innerHTML = "Σχολική Αργία";
        return;
      }
      
      // 2. Σαββατοκύριακο
      if (day === 0 || day === 6) {
        DOM.mainEl.innerHTML = "Καλό Σαββατοκύριακο!";
        DOM.mainEl.style.color = "#a90e0e";
        DOM.subEl.innerHTML = "Το σχολείο είναι κλειστό.";
        DOM.liveDot.classList.add("paused");
        return;
      }

      const schoolStart = Utils.timeToMins(CONFIG.schedule[0].start);
      const schoolEnd = Utils.timeToMins(CONFIG.schedule[CONFIG.schedule.length - 1].end);

      // Πριν / Μετά το σχολείο
      if (currentMins < schoolStart) {
        DOM.mainEl.innerHTML = "Καλημέρα!";
        DOM.mainEl.style.color = "#2c3e50";
        DOM.subEl.innerHTML = `Το κουδούνι χτυπάει σε ${schoolStart - currentMins} λεπτά.`;
        return;
      }
      if (currentMins >= schoolEnd) {
        DOM.mainEl.innerHTML = "Σχόλασμα!";
        DOM.mainEl.style.color = "rgba(17, 17, 17, 0.68)";
        DOM.subEl.innerHTML = "Τα μαθήματα ολοκληρώθηκαν για σήμερα.";
        return;
      }

      // 3. Τρέχουσα Ώρα
      for (let i = 0; i < CONFIG.schedule.length; i++) {
        const periodStart = Utils.timeToMins(CONFIG.schedule[i].start);
        const periodEnd = Utils.timeToMins(CONFIG.schedule[i].end);

        if (currentMins >= periodStart && currentMins < periodEnd) {
          DOM.mainEl.innerHTML = `Τρέχουσα: ${CONFIG.schedule[i].name}`;
          DOM.mainEl.style.color = "#2c3e50";
          
          const minsLeft = periodEnd - currentMins;
          
          if (CONFIG.schedule[i].type === "class") {
              if (i === CONFIG.schedule.length - 1) DOM.subEl.innerHTML = `Σχόλασμα σε ${minsLeft} λεπτά`;
              else if (CONFIG.schedule[i].nextIsBreak) DOM.subEl.innerHTML = `Το διάλειμμα ξεκινά σε ${minsLeft} λεπτά`;
              else DOM.subEl.innerHTML = `Η επόμενη ώρα ξεκινά σε ${minsLeft} λεπτά`;
          } else {
              DOM.subEl.innerHTML = `Μπαίνουμε στις τάξεις σε ${minsLeft} λεπτά`;
          }
          
          const percentage = ((currentMins - periodStart) / (periodEnd - periodStart)) * 100;
          DOM.progBg.style.display = "block";
          
          // RequestAnimationFrame είναι καλύτερο για performance από setTimeout
          window.requestAnimationFrame(() => {
              DOM.progFill.style.width = `${percentage}%`;
          });
          return;
        }
      }
    },

    handleRadarTrigger: (e) => {
      e.stopPropagation();
      if (STATE.isShowingRadar) return;

      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const hour = now.getHours();
      const day = now.getDay();
      
      let catName = 'class';
      if (Utils.getHolidayStatus(now)) catName = 'holiday';
      else if (day === 0 || day === 6) catName = 'weekend';
      else if (hour >= CONFIG.timeThresholds.nightStart || hour < CONFIG.timeThresholds.nightEnd) catName = 'night';
      else if (currentMins >= CONFIG.timeThresholds.evening) catName = 'evening';
      else if (currentMins >= CONFIG.timeThresholds.afternoon) catName = 'afternoon';
      else {
          let currentType = 'class';
          for (let i = 0; i < CONFIG.schedule.length; i++) {
              if (currentMins >= Utils.timeToMins(CONFIG.schedule[i].start) && currentMins < Utils.timeToMins(CONFIG.schedule[i].end)) {
                  currentType = CONFIG.schedule[i].type;
                  break;
              }
          }
          catName = (currentType === 'break') ? 'break' : 'class';
      }

      const activeArray = CONFIG.radarMessages[catName] || ["Σσσς! Το ραντάρ ξεκουράζεται."];
      
      if (!STATE.usedMessages[catName] || STATE.usedMessages[catName].length >= activeArray.length) {
          STATE.usedMessages[catName] = [];
      }
      
      const availableIndexes = activeArray.map((_, i) => i).filter(i => !STATE.usedMessages[catName].includes(i));
      const randomIndex = availableIndexes[Math.floor(Math.random() * availableIndexes.length)];
      
      STATE.usedMessages[catName].push(randomIndex);
      
      STATE.isShowingRadar = true;
      DOM.mainEl.innerHTML = "📡 Ραντάρ Δασκάλων...";
      DOM.mainEl.style.color = "#a90e0e";
      DOM.subEl.innerHTML = activeArray[randomIndex];
      DOM.subEl.style.color = "#1e6cff"; 

      clearTimeout(STATE.radarTimeout);
      STATE.radarTimeout = setTimeout(() => {
          STATE.isShowingRadar = false;
          AppManager.updateTracker();
      }, 7000);
    },

    handleGlobalClick: (e) => {
      if (STATE.isShowingRadar && (!DOM.trackerBox || !DOM.trackerBox.contains(e.target))) {
        clearTimeout(STATE.radarTimeout);
        STATE.isShowingRadar = false;
        AppManager.updateTracker();
      }
    }
  };

  // Ξεκινάμε
  document.addEventListener("DOMContentLoaded", AppManager.init);

})();

(() => {
  "use strict";

  // ==========================================
  // 1. CONFIGURATION & STATIC DATA
  // ==========================================
  const CONFIG = Object.freeze({
    defaultFact: "Κάθε μέρα είναι μια ευκαιρία να μελετήσουμε το παρελθόν και να χτίσουμε ένα καλύτερο μέλλον.",
    storagePrefix: "daily_mission_mobile_",
    animDelay: 50,
    initDelay: 200
  });

  const DATA = Object.freeze({
historyFactsMobile: {
    "0-1": "1896: Ο Ρέντγκεν ανακοινώνει την ανακάλυψη των ακτίνων Χ.",
  "0-2": "2 Ιανουαρίου: Το 1959 εκτοξεύεται το Luna 1, το πρώτο διαστημόπλοιο που κατάφερε να ξεφύγει από τη βαρύτητα της Γης.",
  "0-3": "3 Ιανουαρίου: Το 2009 δημιουργείται το πρώτο μπλοκ (Genesis Block) του Bitcoin, ξεκινώντας την εποχή των κρυπτονομισμάτων.",
  "0-4": "4 Ιανουαρίου: Το 1809 γεννιέται ο Λουδοβίκος Μπράιγ, που εφηύρε το σύστημα ανάγνωσης και γραφής για τυφλούς.",
  "0-5": "5 Ιανουαρίου: Το 1933 ξεκινά η κατασκευή της περίφημης γέφυρας Γκόλντεν Γκέιτ (Golden Gate) στο Σαν Φρανσίσκο.",
  "0-6": "1921: Ιδρύεται το Κομμουνιστικό Κόμμα της Ελλάδας.",
  "0-8": "1642: Πεθαίνει ο Γαλιλαίος Γαλιλέι, ο πατέρας της σύγχρονης αστρονομίας.",
  "0-9": "9 Ιανουαρίου: Το 2007 ο Στιβ Τζομπς παρουσιάζει το πρώτο iPhone, αλλάζοντας για πάντα τον κόσμο των κινητών τηλεφώνων.",
  "0-10": "49 π.Χ.: Ο Ιούλιος Καίσαρας διαβαίνει τον Ρουβίκωνα: 'Alea jacta est'.",
  "0-11": "11 Ιανουαρίου: Το 1935 η Αμέλια Έρχαρτ γίνεται η πρώτη γυναίκα που πετάει μόνη της τον Ειρηνικό Ωκεανό, από τη Χαβάη στην Καλιφόρνια.",
  "0-12": "1945: Οι Σύμμαχοι απελευθερώνουν το Άουσβιτς.",
  "0-14": "14 Ιανουαρίου: Το 2005 το διαστημικό σκάφος Χόιχενς (Huygens) προσεδαφίζεται στον Τιτάνα, τον μεγαλύτερο δορυφόρο του Κρόνου.",
  "0-15": "1759: Ανοίγει το Βρετανικό Μουσείο στο Λονδίνο.",
  "0-16": "16 Ιανουαρίου: Το 1605 εκδίδεται στην Ισπανία ο πρώτος τόμος του «Δον Κιχώτη» από τον συγγραφέα Μιγκέλ ντε Θερβάντες.",
  "0-17": "17 Ιανουαρίου: Το 1706 γεννιέται ο Βενιαμίν Φραγκλίνος, σπουδαίος επιστήμονας, εφευρέτης του αλεξικέραυνου.",
  "0-18": "1919: Ξεκινά η Συνδιάσκεψη Ειρήνης στο Παρίσι μετά τον Α' Παγκόσμιο Πόλεμο.",
  "0-19": "19 Ιανουαρίου: Το 1983 η Apple ανακοινώνει τον υπολογιστή Lisa, τον πρώτο εμπορικό υπολογιστή με γραφικό περιβάλλον χρήστη (GUI) και ποντίκι.",
  "0-20": "20 Ιανουαρίου: Το 1892 διεξάγεται ο πρώτος επίσημος αγώνας καλαθοσφαίρισης (μπάσκετ) που επινοήθηκε από τον Τζέιμς Νάισμιθ.",
  "0-22": "1924: Πεθαίνει ο Βλαντιμίρ Λένιν και η Αγία Πετρούπολη μετονομάζεται σε Λένινγκραντ.",
  "0-23": "23 Ιανουαρίου: Το 1849 η Ελίζαμπεθ Μπλάκγουελ γίνεται η πρώτη γυναίκα στις ΗΠΑ που λαμβάνει πτυχίο ιατρικής.",
  "0-24": "24 Ιανουαρίου: Το 1986 το διαστημόπλοιο Βόγιατζερ 2 περνάει για πρώτη φορά κοντά από τον πλανήτη Ουρανό.",
  "0-25": "1822: Η Α' Εθνοσυνέλευση της Επιδαύρου ψηφίζει το πρώτο Σύνταγμα της Ελλάδας.",
  "0-27": "27 Ιανουαρίου: Το 1880 ο Τόμας Έντισον λαμβάνει το δίπλωμα ευρεσιτεχνίας για τον πρώτο πρακτικό ηλεκτρικό λαμπτήρα.",
  "0-28": "1986: Το διαστημικό λεωφορείο Challenger εκρήγνυται 73 δευτερόλεπτα μετά την εκτόξευση.",
  "0-30": "1948: Δολοφονείται ο Μαχάτμα Γκάντι, ο ηγέτης της μη βίας στην Ινδία.",
  "0-31": "31 Ιανουαρίου: Το 1958 οι ΗΠΑ εκτοξεύουν τον Explorer 1, τον πρώτο τους τεχνητό δορυφόρο στο διάστημα.",

    "1-1": "1979: Ο Αγιατολάχ Χομεϊνί επιστρέφει στο Ιράν μετά από 15 χρόνια εξορίας.",
  "1-2": "2 Φεβρουαρίου: Το 1925 ένα έλκηθρο με σκυλιά και αρχηγό τον σκύλο Μπάλτο, φτάνει στην παγωμένη Αλάσκα μεταφέροντας σωτήριο φάρμακο.",
  "1-3": "3 Φεβρουαρίου: Το 1966 το σοβιετικό σκάφος Luna 9 πραγματοποιεί την πρώτη ομαλή προσελήνωση και στέλνει φωτογραφίες.",
  "1-4": "1945: Ξεκινά η Διάσκεψη της Γιάλτας μεταξύ Τσόρτσιλ, Ρούσβελτ και Στάλιν.",
  "1-5": "5 Φεβρουαρίου: Το 1971 οι αστροναύτες του Apollo 14 περπατούν στη Σελήνη.",
  "1-6": "1952: Η Ελισάβετ Β' γίνεται Βασίλισσα της Μεγάλης Βρετανίας.",
  "1-7": "7 Φεβρουαρίου: Το 1984 οι αστροναύτες Μπρους ΜακΚάντλες και Ρόμπερτ Στιούαρτ κάνουν τον πρώτο διαστημικό περίπατο χωρίς καλώδιο ασφαλείας.",
  "1-8": "8 Φεβρουαρίου: Το 1833 ο βασιλιάς Όθωνας φτάνει στο Ναύπλιο, την πρώτη πρωτεύουσα του νεότερου Ελληνικού Κράτους.",
  "1-9": "1942: Ο Ελληνικός Στρατός νικά τους Ιταλούς στην Πίνδο.",
  "1-10": "10 Φεβρουαρίου: Το 1996 ο υπερυπολογιστής Deep Blue της IBM κερδίζει για πρώτη φορά σε παρτίδα σκακιού τον παγκόσμιο πρωταθλητή Γκάρι Κασπάροφ.",
  "1-11": "11 Φεβρουαρίου: Το 1847 γεννιέται ο Τόμας Έντισον, ένας από τους μεγαλύτερους εφευρέτες που άλλαξαν τον κόσμο μας.",
  "1-12": "1809: Γεννιέται ο Κάρολος Δαρβίνος, θεμελιωτής της θεωρίας της εξέλιξης.",
  "1-14": "14 Φεβρουαρίου: Το 1946 παρουσιάζεται ο ENIAC, ο πρώτος ηλεκτρονικός υπολογιστής γενικής χρήσης, που καταλάμβανε ένα ολόκληρο δωμάτιο.",
  "1-15": "1564: Γεννιέται ο Γαλιλαίος Γαλιλέι στην Πίζα.",
  "1-18": "18 Φεβρουαρίου: Το 1930 ο νεαρός αστρονόμος Κλάιντ Τόμπο ανακαλύπτει τον Πλούτωνα, στις άκρες του ηλιακού μας συστήματος.",
  "1-19": "1473: Γεννιέται ο Νικόλαος Κοπέρνικος, που έθεσε τον Ήλιο στο κέντρο του σύμπαντος.",
  "1-22": "1732: Γεννιέται ο Τζορτζ Ουάσινγκτον, ο πρώτος πρόεδρος των ΗΠΑ.",
  "1-23": "23 Φεβρουαρίου: Το 1455 ο Ιωάννης Γουτεμβέργιος τυπώνει το πρώτο βιβλίο με κινητά γράμματα, τη Βίβλο, αλλάζοντας την ιστορία της γνώσης.",
  "1-25": "1921: Η Τιφλίδα καταλαμβάνεται από τον Κόκκινο Στρατό.",
  "1-27": "27 Φεβρουαρίου: Το 1932 ο φυσικός Τζέιμς Τσάντγουικ ανακαλύπτει το νετρόνιο, ένα βασικό σωματίδιο του ατόμου.",
  "1-28": "1922: Η Μεγάλη Βρετανία αναγνωρίζει την ανεξαρτησία της Αιγύπτου.",

    "2-1": "1919: Ιδρύεται το Μπάουχαους, η σχολή που άλλαξε τη μοντέρνα αρχιτεκτονική.",
  "2-2": "2 Μαρτίου: Το 1969 πραγματοποιεί την παρθενική του πτήση το υπερηχητικό επιβατικό αεροπλάνο Κονκόρντ (Concorde).",
  "2-3": "1918: Υπογράφεται η συνθήκη του Μπρεστ-Λιτόφσκ.",
  "2-4": "4 Μαρτίου: Το 1877 ο Εμίλ Μπερλίνερ εφευρίσκει το μικρόφωνο.",
  "2-5": "5 Μαρτίου: Το 1616 η Καθολική Εκκλησία απαγορεύει το βιβλίο του Κοπέρνικου που υποστήριζε σωστά ότι η Γη γυρίζει γύρω από τον Ήλιο.",
  "2-6": "1957: Η Γκάνα γίνεται η πρώτη χώρα της υποσαχάριας Αφρικής που αποκτά ανεξαρτησία.",
  "2-7": "7 Μαρτίου: Το 1876 ο Αλεξάντερ Γκράχαμ Μπελ λαμβάνει το δίπλωμα ευρεσιτεχνίας για το τηλέφωνο.",
  "2-9": "9 Μαρτίου: Το 1934 γεννιέται ο Γιούρι Γκαγκάριν, ο πρώτος άνθρωπος που ταξίδεψε στο διάστημα.",
  "2-10": "10 Μαρτίου: Το 1876 ο Αλεξάντερ Γκράχαμ Μπελ κάνει την πρώτη επιτυχημένη τηλεφωνική κλήση στον βοηθό του.",
  "2-12": "1918: Η Μόσχα γίνεται ξανά πρωτεύουσα της Ρωσίας.",
  "2-13": "13 Μαρτίου: Το 1781 ο αστρονόμος Ουίλιαμ Χέρσελ ανακαλύπτει τον πλανήτη Ουρανό.",
  "2-14": "14 Μαρτίου: Το 1879 γεννιέται ο Άλμπερτ Αϊνστάιν, ο ιδιοφυής επιστήμονας που άλλαξε τον τρόπο που κατανοούμε το σύμπαν.",
  "2-15": "15 Μαρτίου: Το 1985 καταχωρείται το πρώτο domain name (όνομα ιστοσελίδας) στο διαδίκτυο (symbolics.com).",
  "2-17": "17 Μαρτίου: Το 1958 εκτοξεύεται ο Vanguard 1, ο οποίος είναι σήμερα ο παλαιότερος τεχνητός δορυφόρος που συνεχίζει να βρίσκεται στο διάστημα.",
  "2-18": "1962: Τερματίζεται ο πόλεμος της Αλγερίας με τη Γαλλία.",
  "2-19": "19 Μαρτίου: Το 1895 οι αδερφοί Λιμιέρ καταγράφουν το πρώτο τους κινηματογραφικό φιλμ.",
  "2-20": "20 Μαρτίου: Το 1727 φεύγει από τη ζωή ο Ισαάκ Νεύτων, ο σπουδαίος φυσικός που διατύπωσε τον νόμο της παγκόσμιας έλξης (βαρύτητα).",
  "2-21": "1960: Σφαγή στη Σάρπβιλ της Νότιας Αφρικής κατά του απαρτχάιντ.",
  "2-22": "22 Μαρτίου: Το 1895 οι αδελφοί Λιμιέρ προβάλλουν την πρώτη κινηματογραφική ταινία σε μια μικρή ιδιωτική προβολή στο Παρίσι.",
  "2-23": "23 Μαρτίου: Το 1821 απελευθερώνεται η Καλαμάτα από τους Έλληνες αγωνιστές, αποτελώντας την πρώτη ελεύθερη πόλη της Επανάστασης.",
  "2-24": "24 Μαρτίου: Το 1882 ο Ρόμπερτ Κοχ ανακοινώνει την ανακάλυψη του βακτηρίου που προκαλεί τη φυματίωση.",
  "2-25": "1821: Ο Παλαιών Πατρών Γερμανός υψώνει το λάβαρο της Επανάστασης στην Αγία Λαύρα.",
  "2-26": "26 Μαρτίου: Το 1953 ο Τζόνας Σαλκ ανακοινώνει την επιτυχή δοκιμή του εμβολίου κατά της πολιομυελίτιδας.",
  "2-28": "1922: Η Αίγυπτος ανεξαρτητοποιείται από τη Μεγάλη Βρετανία.",
  "2-29": "29 Μαρτίου: Το 1974 ντόπιοι αγρότες στην Κίνα ανακαλύπτουν τυχαία σκάβοντας τον περίφημο «Πήλινο Στρατό» με χιλιάδες αγάλματα πολεμιστών.",
  "2-31": "31 Μαρτίου: Το 1889 εγκαινιάζεται στο Παρίσι ο Πύργος του Άιφελ, το ψηλότερο κτίριο του κόσμου για εκείνη την εποχή.",

   "3-1": "1 Απριλίου: Το 1976 ιδρύεται η εταιρεία Apple Computer από τους Στιβ Τζομπς και Στιβ Βόζνιακ.",
"3-2": "1982: Ξεκινά ο Πόλεμος των Φώκλαντ μεταξύ Αργεντινής και Βρετανίας.",
"3-3": "3 Απριλίου: Το 1973 ο Μάρτιν Κούπερ της Motorola πραγματοποιεί την πρώτη κλήση από κινητό τηλέφωνο.",
"3-4": "1949: Ιδρύεται το ΝΑΤΟ στην Ουάσινγκτον.",
"3-5": "5 Απριλίου: Το 1904 γεννιέται ο Ρόμπερτ Οπενχάιμερ, ο θεωρητικός φυσικός που ηγήθηκε του Προγράμματος Μανχάταν.",
"3-6": "1896: Οι πρώτοι σύγχρονοι Ολυμπιακοί Αγώνες στην Αθήνα.",
"3-7": "7 Απριλίου: Το 1948 ιδρύεται ο Παγκόσμιος Οργανισμός Υγείας, με σκοπό να φροντίζει για την υγεία των ανθρώπων σε όλο τον πλανήτη.",
"3-8": "8 Απριλίου: Το 1911 ανακαλύπτεται η υπεραγωγιμότητα από τον Ολλανδό φυσικό Χάικε Κάμερλινγκ Όνες.",
"3-9": "1940: Η Γερμανία εισβάλλει στη Νορβηγία και τη Δανία.",
"3-10": "10 Απριλίου: Το 2019 δημοσιεύεται η πρώτη φωτογραφία μιας μαύρης τρύπας στην ιστορία της ανθρωπότητας.",
"3-11": "11 Απριλίου: Το 1970 εκτοξεύεται το διαστημόπλοιο Apollo 13. Αν και υπέστη βλάβη, το πλήρωμα επέστρεψε στη Γη με ασφάλεια.",
"3-12": "1961: Ο Γιούρι Γκαγκάριν ολοκληρώνει μια πλήρη τροχιά γύρω από τη Γη.",
"3-13": "13 Απριλίου: Το 1970 ακούγεται η περίφημη φράση «Χιούστον, έχουμε πρόβλημα» από τους αστροναύτες του Apollo 13.",
"3-14": "14 Απριλίου: Το 1828 κυκλοφορεί το πρώτο αμερικανικό λεξικό από τον Νόα Γουέμπστερ, οργανώνοντας την αγγλική γλώσσα.",
"3-15": "1912: Βυθίζεται ο Τιτανικός στο παρθενικό του ταξίδι.",
"3-16": "16 Απριλίου: Το 1943 ο Ελβετός χημικός Άλμπερτ Χόφμαν ανακαλύπτει τυχαία τις ιδιότητες του LSD.",
"3-17": "17 Απριλίου: Το 1964 παρουσιάζεται για πρώτη φορά σε μεγάλη έκθεση το θρυλικό αυτοκίνητο Ford Mustang.",
"3-18": "1906: Μεγάλος σεισμός καταστρέφει το Σαν Φρανσίσκο.",
"3-19": "19 Απριλίου: Το 1971 εκτοξεύεται ο Salyut 1, ο πρώτος διαστημικός σταθμός στην ιστορία.",
"3-21": "21 Απριλίου: Το 1989 λανσάρεται το Game Boy από τη Nintendo, φέρνοντας επανάσταση στα φορητά βιντεοπαιχνίδια.",
"3-22": "22 Απριλίου: Το 1500 ο Πορτογάλος εξερευνητής Πέδρο Άλβαρες Καμπράλ φτάνει στις ακτές της Νότιας Αμερικής και ανακαλύπτει τη Βραζιλία.",
"3-24": "24 Απριλίου: Το 1990 εκτοξεύεται στο διάστημα το διαστημικό τηλεσκόπιο Hubble (Χαμπλ).",
"3-25": "25 Απριλίου: Το 1859 ξεκινά η κατασκευή της Διώρυγας του Σουέζ, ενός τεράστιου έργου που ένωσε τη Μεσόγειο με την Ερυθρά Θάλασσα.",
"3-27": "1909: Ιδρύεται η πόλη του Τελ Αβίβ.",
"3-28": "28 Απριλίου: Το 2001 ο Ντένις Τίτο γίνεται ο πρώτος πολίτης που ταξιδεύει στο διάστημα ως «τουρίστας».",

   // ΜΑΪΟΣ
"4-1": "1 Μαΐου: Το 1886 οργανώνεται στο Σικάγο μια τεράστια απεργία εργατών που διεκδικούσαν να δουλεύουν οκτώ ώρες την ημέρα.",
"4-2": "2 Μαΐου: Το 1519 πεθαίνει ο Λεονάρντο ντα Βίντσι, η απόλυτη ιδιοφυΐα της Αναγέννησης.",
"4-3": "3 Μαΐου: Το 1937 η Αμερικανίδα συγγραφέας Μάργκαρετ Μίτσελ κερδίζει το βραβείο Πούλιτζερ για το διάσημο βιβλίο της «Όσα Παίρνει ο Άνεμος».",
"4-5": "1821: Πεθαίνει ο Ναπολέων Βοναπάρτης στο νησί της Αγίας Ελένης.",
"4-6": "6 Μαΐου: Το 1994 εγκαινιάζεται η Σήραγγα της Μάγχης, ενώνοντας υποθαλάσσια τη Γαλλία με τη Μεγάλη Βρετανία.",
"4-8": "8 Μαΐου: Το 1886 ο Τζον Πέμπερτον, ένας φαρμακοποιός στην Ατλάντα, δημιουργεί τη μυστική συνταγή για την Coca-Cola.",
"4-10": "10 Μαΐου: Το 1997 ο υπολογιστής Deep Blue της IBM νικά τον παγκόσμιο πρωταθλητή στο σκάκι Γκάρι Κασπάροφ.",
"4-11": "330: Ο Μέγας Κωνσταντίνος εγκαινιάζει την Κωνσταντινούπολη.",
"4-12": "12 Μαΐου: Το 1928 ο Μίκυ Μάους εμφανίζεται για πρώτη φορά σε δοκιμαστική προβολή της βωβής ταινίας κινουμένων σχεδίων «Plane Crazy».",
"4-13": "13 Μαΐου: Το 1857 γεννιέται ο Ρόναλντ Ρος, που βραβεύτηκε με Νόμπελ για την ανακάλυψη της μετάδοσης της ελονοσίας από τα κουνούπια.",
"4-14": "1920: Ο Ελληνικός Στρατός απελευθερώνει την Αλεξανδρούπολη (Δεδέαγατς).",
"4-15": "15 Μαΐου: Το 1618 ο σπουδαίος μαθηματικός Γιοχάνες Κέπλερ διατυπώνει τον τρίτο νόμο του για το πώς κινούνται οι πλανήτες γύρω από τον Ήλιο.",
"4-16": "16 Μαΐου: Το 1960 ο Θίοντορ Μάιμαν παρουσιάζει το πρώτο λειτουργικό λέιζερ (LASER).",
"4-18": "18 Μαΐου: Το 1969 εκτοξεύεται το Apollo 10, κάνοντας την τελευταία επιτυχημένη πρόβα πριν πατήσει ο άνθρωπος στο φεγγάρι.",
"4-19": "1919: Ο Μουσταφά Κεμάλ αποβιβάζεται στη Σαμψούντα, αρχή του εθνικού κινήματος.",
"4-20": "20 Μαΐου: Το 1873 κατοχυρώνεται επίσημα η κατασκευή των μπλου τζιν (blue jeans), του πιο διάσημου ρούχου στον κόσμο.",
"4-21": "21 Μαΐου: Το 1927 ο Τσαρλς Λίντμπεργκ ολοκληρώνει την πρώτη υπερατλαντική πτήση χωρίς στάση.",
"4-23": "1945: Οι Σύμμαχοι απελευθερώνουν το στρατόπεδο του Νταχάου.",
"4-24": "24 Μαΐου: Το 1844 ο Σάμιουελ Μορς στέλνει επιτυχημένα το πρώτο τηλεγράφημα, ανοίγοντας τον δρόμο για τις σύγχρονες επικοινωνίες.",
"4-25": "25 Μαΐου: Το 1977 κάνει πρεμιέρα στους κινηματογράφους η πρώτη ταινία «Ο Πόλεμος των Άστρων» (Star Wars).",
"4-27": "27 Μαΐου: Το 1931 πραγματοποιείται η πρώτη πτήση στο στρατόσφαιρο (στα 15.781 μέτρα) από τον Ογκίστ Πικάρ.",
"4-28": "28 Μαΐου: Το 1932 οργανώνονται δημοτικές εκλογές στην Ελλάδα όπου ψηφίζουν για πρώτη φορά, δειλά δειλά, κάποιες γυναίκες.",
"4-29": "1453: Άλωση της Κωνσταντινούπολης: Το τέλος του Βυζαντίου.",

    "5-1": "1 Ιουνίου: Το 1980 ξεκινά η λειτουργία του CNN, του πρώτου τηλεοπτικού δικτύου με 24ωρη μετάδοση ειδήσεων.",
"5-3": "3 Ιουνίου: Το 1965 ο Έντουαρντ Χουάιτ γίνεται ο πρώτος Αμερικανός αστροναύτης που πραγματοποιεί διαστημικό περίπατο.",
"5-4": "1989: Η εξέγερση της Πλατείας Τιεν Αν Μεν στην Κίνα.",
"5-5": "5 Ιουνίου: Το 1977 πωλείται ο Apple II, ο πρώτος προσωπικός υπολογιστής που γνώρισε μαζική επιτυχία στα σπίτια.",
"5-6": "6 Ιουνίου: Το 1984 κυκλοφορεί το Tetris, το εμβληματικό βιντεοπαιχνίδι παζλ που κατέκτησε όλο τον κόσμο.",
"5-7": "7 Ιουνίου: Το 1494 υπογράφεται η Συνθήκη της Τορδεσίγιας, χωρίζοντας τον χάρτη του Νέου Κόσμου ανάμεσα σε Ισπανία και Πορτογαλία.",
"5-8": "8 Ιουνίου: Το 1912 ιδρύεται το στούντιο της Universal Pictures, δημιουργώντας εκατοντάδες κλασικές ταινίες του κινηματογράφου.",
"5-9": "9 Ιουνίου: Το 1821 πεθαίνει ο Αδαμάντιος Κοραής, κορυφαίος διαφωτιστής, φιλόλογος και δάσκαλος του Γένους.",
"5-10": "1943: Η Μάχη του Κουρσκ, η μεγαλύτερη αρματομαχία στην ιστορία.",
"5-11": "11 Ιουνίου: Το 1910 γεννιέται ο Ζακ-Υβ Κουστώ, Γάλλος ωκεανογράφος, εφευρέτης και πρωτοπόρος εξερευνητής του βυθού.",
"5-12": "1994: Ο Νέλσον Μαντέλα αναλαμβάνει πρόεδρος της Νότιας Αφρικής.",
"5-13": "13 Ιουνίου: Το 1983 το διαστημικό σκάφος Pioneer 10 γίνεται το πρώτο ανθρώπινο κατασκεύασμα που βγαίνει από το ηλιακό μας σύστημα.",
"5-14": "14 Ιουνίου: Το 1951 παραδίδεται ο UNIVAC I, ο πρώτος εμπορικός υπολογιστής στον κόσμο, ικανός να λύνει πολύπλοκες πράξεις γρήγορα.",
"5-15": "15 Ιουνίου: Το 1752 ο Βενιαμίν Φραγκλίνος πετάει έναν χαρταετό σε καταιγίδα και αποδεικνύει ότι οι αστραπές είναι ηλεκτρισμός.",
"5-16": "1963: Η πρώτη γυναίκα στο διάστημα, Βαλεντίνα Τερεσκόβα.",
"5-18": "18 Ιουνίου: Το 1815 διεξάγεται η θρυλική Μάχη του Βατερλό, όπου ο στρατός του Ναπολέοντα ηττάται οριστικά.",
"5-19": "19 Ιουνίου: Το 1623 γεννιέται ο Μπλεζ Πασκάλ, σπουδαίος μαθηματικός, φυσικός και φιλόσοφος.",
"5-20": "1913: Απελευθέρωση της Κατερίνης από τον ελληνικό στρατό κατά τους Βαλκανικούς Πολέμους.",
"5-21": "21 Ιουνίου: Το 2004 το SpaceShipOne γίνεται το πρώτο διαστημόπλοιο που κατασκευάστηκε από ιδιώτες και καταφέρνει να φτάσει στο διάστημα.",
"5-22": "22 Ιουνίου: Το 1633 ο Γαλιλαίος αναγκάζεται από την Ιερά Εξέταση να απαρνηθεί τη θεωρία του ότι η Γη γυρίζει γύρω από τον Ήλιο.",
"5-23": "1913: Μάχη του Κιλκίς, καθοριστική νίκη για την απελευθέρωση της Μακεδονίας.",
"5-25": "25 Ιουνίου: Το 1903 γεννιέται ο Τζορτζ Όργουελ, συγγραφέας του εμβληματικού δυστοπικού μυθιστορήματος «1984».",
"5-27": "27 Ιουνίου: Το 1967 εγκαθίσταται το πρώτο ΑΤΜ (Αυτόματη Ταμειολογική Μηχανή) στο Λονδίνο.",
"5-28": "1914: Δολοφονία του Αρχιδούκα Φερδινάνδου στο Σεράγεβο, αιτία του Α' ΠΠ.",
"5-30": "30 Ιουνίου: Το 1908 πέφτει ένας τεράστιος μετεωρίτης στην περιοχή Τουνγκούσκα της Σιβηρίας, καταστρέφοντας εκατομμύρια δέντρα.",

    "6-1": "1 Ιουλίου: Το 1979 κυκλοφορεί το Walkman από τη Sony, αλλάζοντας δραστικά τον τρόπο που ακούμε μουσική εν κινήσει.",
"6-2": "2 Ιουλίου: Το 1900 πραγματοποιεί την πρώτη του επιτυχημένη πτήση το αερόπλοιο Ζέπελιν πάνω από μια λίμνη της Γερμανίας.",
"6-3": "3 Ιουλίου: Το 1886 ο Καρλ Μπεντς οδηγεί το πρώτο αυτοκίνητο με κινητήρα εσωτερικής καύσης.",
"6-4": "1776: Διακήρυξη Ανεξαρτησίας των ΗΠΑ.",
"6-5": "5 Ιουλίου: Το 1687 ο Ισαάκ Νεύτων εκδίδει το βιβλίο «Principia», ίσως το πιο σημαντικό βιβλίο στην ιστορία της φυσικής.",
"6-6": "6 Ιουλίου: Το 1885 ο Λουί Παστέρ δοκιμάζει με επιτυχία το πρώτο εμβόλιο κατά της λύσσας σε έναν 9χρονο που είχε δαγκωθεί από σκύλο.",
"6-7": "7 Ιουλίου: Το 1928 κυκλοφορεί για πρώτη φορά στα ράφια των καταστημάτων ψωμί κομμένο σε φέτες, ενθουσιάζοντας τους καταναλωτές.",
"6-8": "8 Ιουλίου: Το 1497 ο γενναίος θαλασσοπόρος Βάσκο ντα Γκάμα ξεκινά με τα πλοία του για να βρει θαλάσσιο δρόμο προς την Ινδία.",
"6-9": "9 Ιουλίου: Το 1935 συστήνεται ο μηχανισμός του ραντάρ, μια τεχνολογία ζωτικής σημασίας για την αεροπλοΐα.",
"6-10": "10 Ιουλίου: Το 1856 γεννιέται ο Νίκολα Τέσλα, ο πρωτοπόρος της επιστήμης του εναλλασσόμενου ρεύματος και των ασύρματων επικοινωνιών.",
"6-12": "12 Ιουλίου: Το 2022 η NASA δίνει στη δημοσιότητα τις πρώτες εκπληκτικές έγχρωμες εικόνες από το διαστημικό τηλεσκόπιο James Webb.",
"6-14": "1789: Πτώση της Βαστίλης: Γαλλική Επανάσταση.",
"6-16": "16 Ιουλίου: Το 1969 εκτοξεύεται ο πύραυλος Saturn V, μεταφέροντας το Apollo 11 και τους πρώτους ανθρώπους προς τη Σελήνη.",
"6-17": "17 Ιουλίου: Το 1955 ανοίγει τις πύλες του το πιο διάσημο θεματικό πάρκο στον κόσμο, η Disneyland στην Καλιφόρνια.",
"6-18": "18 Ιουλίου: Το 1976 η 14χρονη Νάντια Κομανέτσι γίνεται η πρώτη αθλήτρια που παίρνει το απόλυτο «10» στη γυμναστική στους Ολυμπιακούς Αγώνες.",
"6-20": "1969: Ο Νιλ Άρμστρονγκ πατά στη Σελήνη.",
"6-21": "21 Ιουλίου: Το 356 π.Χ. γεννιέται ο Μέγας Αλέξανδρος στην Πέλλα της Μακεδονίας, ο βασιλιάς που θα δημιουργούσε μια τεράστια αυτοκρατορία.",
"6-26": "26 Ιουλίου: Το 1989 απαγγέλλεται η πρώτη νομική κατηγορία παγκοσμίως για εξάπλωση ιού σε ηλεκτρονικούς υπολογιστές.",
"6-29": "29 Ιουλίου: Το 1836 εγκαινιάζεται η Αψίδα του Θριάμβου στο Παρίσι, ένα από τα πιο διάσημα μνημεία της Ευρώπης.",
"6-30": "30 Ιουλίου: Το 2020 εκτοξεύεται το ρόβερ Perseverance της NASA με προορισμό τον πλανήτη Άρη.",
"6-31": "31 Ιουλίου: Το 1971 οι αστροναύτες του Apollo 15 οδηγούν για πρώτη φορά το ειδικό τζιπάκι (Rover) στην επιφάνεια της Σελήνης.",

"7-1": "1 Αυγούστου: Το 1981 ξεκινά η εκπομπή του MTV, φέρνοντας επανάσταση στα μουσικά βίντεο κλιπ (το πρώτο βίντεο ήταν το «Video Killed the Radio Star»).",
"7-3": "3 Αυγούστου: Το 1492 ο Χριστόφορος Κολόμβος φεύγει από την Ισπανία με τρία καράβια (Νίνια, Πίντα, Σάντα Μαρία) για να εξερευνήσει τον κόσμο.",
"7-4": "4 Αυγούστου: Το 1901 γεννιέται ο Λούις Άρμστρονγκ, ένας από τους θρύλους της τζαζ μουσικής.",
"7-5": "5 Αυγούστου: Το 2012 το ρομποτικό όχημα Curiosity της NASA προσεδαφίζεται επιτυχώς στον Άρη για να ψάξει ίχνη ζωής.",
"7-6": "1945: Ρίψη ατομικής βόμβας στη Χιροσίμα.",
"7-9": "9 Αυγούστου: Το 1928 γεννιέται ο Μάρβιν Μίνσκυ, πρωτοπόρος επιστήμονας στον τομέα της Τεχνητής Νοημοσύνης.",
"7-12": "12 Αυγούστου: Το 1990 ανακαλύπτεται από παλαιοντολόγους ο πιο πλήρης και εντυπωσιακός σκελετός δεινοσαύρου Τυραννόσαυρου Ρεξ.",
"7-14": "14 Αυγούστου: Το 1893 η Γαλλία γίνεται η πρώτη χώρα που εκδίδει πινακίδες κυκλοφορίας για τα αυτοκίνητα.",
"7-15": "1914: Η Αυστρία κηρύσσει τον πόλεμο στη Σερβία.",
"7-17": "17 Αυγούστου: Το 1970 εκτοξεύεται η σοβιετική αποστολή Venera 7, το πρώτο σκάφος που προσεδαφίστηκε ποτέ στον πλανήτη Αφροδίτη.",
"7-20": "20 Αυγούστου: Το 1977 εκτοξεύεται το διαστημόπλοιο Voyager 2 για να μελετήσει τους εξωτερικούς πλανήτες του ηλιακού συστήματος.",
"7-21": "21 Αυγούστου: Το 1911 κλέβεται από το Λούβρο ο πιο διάσημος πίνακας ζωγραφικής, η «Μόνα Λίζα» (αλλά βρέθηκε δύο χρόνια μετά).",
"7-22": "22 Αυγούστου: Το 1864 υπογράφεται η πρώτη Συνθήκη της Γενεύης για την προστασία των τραυματιών πολέμου και ιδρύεται ο Ερυθρός Σταυρός.",
"7-23": "23 Αυγούστου: Το 1991 δημιουργείται ο πρώτος ιστότοπος (website) στο World Wide Web, στους υπολογιστές του CERN.",
"7-24": "1974: Πτώση της Χούντας στην Ελλάδα.",
"7-26": "26 Αυγούστου: Το 1743 γεννιέται ο Αντουάν Λαβουαζιέ, ο πατέρας της σύγχρονης χημείας.",
"7-27": "27 Αυγούστου: Το 1883 εκρήγνυται το ηφαίστειο Κρακατόα, προκαλώντας τον πιο δυνατό ήχο που άκουσε ποτέ η ανθρωπότητα.",
"7-28": "28 Αυγούστου: Το 1963 ο Μάρτιν Λούθερ Κινγκ βγάζει τον ιστορικό λόγο «Έχω ένα όνειρο» για την ισότητα όλων των ανθρώπων.",
"7-29": "29 Αυγούστου: Το 1885 ο μηχανικός Γκότλιμπ Ντάιμλερ κατασκευάζει και κατοχυρώνει την πρώτη μοτοσικλέτα στον κόσμο.",
"7-31": "31 Αυγούστου: Το 1897 κατοχυρώνεται η πατέντα για τον κινηματογραφικό προβολέα (Κινητοσκόπιο) του Τόμας Έντισον.",

 
    "8-1": "1 Σεπτεμβρίου: Το 1985 εντοπίζεται το ναυάγιο του Τιτανικού από την ωκεανογραφική ομάδα του Ρόμπερτ Μπάλαρντ.",
"8-2": "2 Σεπτεμβρίου: Το 1666 ξεσπά η Μεγάλη Πυρκαγιά του Λονδίνου, η οποία ξεκίνησε από έναν φούρνο και κατέστρεψε την ξύλινη πόλη.",
"8-3": "3 Σεπτεμβρίου: Το 1976 το μη επανδρωμένο σκάφος Viking 2 της NASA προσεδαφίζεται επιτυχώς στον Άρη.",
"8-5": "5 Σεπτεμβρίου: Το 1977 εκτοξεύεται το διαστημόπλοιο Voyager 1 που σήμερα ταξιδεύει στο σκοτεινό διάστημα, έξω από το ηλιακό μας σύστημα.",
"8-6": "6 Σεπτεμβρίου: Το 1844 γεννιέται ο Χόρχε Λουίς Μπόρχες, από τους σπουδαιότερους συγγραφείς του 20ού αιώνα.",
"8-7": "7 Σεπτεμβρίου: Το 1822 η Βραζιλία ανακηρύσσει την ανεξαρτησία της από την Πορτογαλία, χάρη στον αυτοκράτορα Πέτρο Α'.",
"8-9": "9 Σεπτεμβρίου: Το 1947 καταγράφεται το πρώτο bug (σφάλμα) υπολογιστή, όταν ένας πραγματικός σκόρος βρέθηκε στα κυκλώματα του υπολογιστή Mark II.",
"8-12": "12 Σεπτεμβρίου: Το 1958 κατασκευάζεται το πρώτο ολοκληρωμένο κύκλωμα (μικροτσίπ) από τον μηχανικό Τζακ Κίλμπι.",
"8-13": "13 Σεπτεμβρίου: Το 1985 κυκλοφορεί στην Ιαπωνία το θρυλικό βιντεοπαιχνίδι «Super Mario Bros.», κάνοντας τον Μάριο διάσημο.",
"8-14": "1922: Η Καταστροφή της Σμύρνης σηματοδοτεί την προσφυγιά για χιλιάδες οικογένειες στη Μακεδονία.",
"8-17": "17 Σεπτεμβρίου: Το 1787 υπογράφεται το Σύνταγμα των Ηνωμένων Πολιτειών της Αμερικής, ένα από τα παλαιότερα γραπτά συντάγματα.",
"8-18": "18 Σεπτεμβρίου: Το 1851 εκδίδεται το πρώτο φύλλο της ιστορικής αμερικανικής εφημερίδας The New York Times.",
"8-20": "20 Σεπτεμβρίου: Το 1946 διοργανώνεται το πρώτο Διεθνές Φεστιβάλ Κινηματογράφου των Καννών στη Γαλλία.",
"8-22": "22 Σεπτεμβρίου: Το 1791 γεννιέται ο Μάικλ Φαραντέι, πρωτοπόρος στον ηλεκτρομαγνητισμό και την ηλεκτροχημεία.",
"8-23": "23 Σεπτεμβρίου: Το 1846 ο αστρονόμος Γιόχαν Γκάλε κοιτάζει το τηλεσκόπιό του και γίνεται ο πρώτος που εντοπίζει τον πλανήτη Ποσειδώνα.",
"8-24": "24 Σεπτεμβρίου: Το 2014 το ινδικό σκάφος Mangalyaan μπαίνει σε τροχιά γύρω από τον Άρη.",
"8-27": "27 Σεπτεμβρίου: Το 1822 ο Γάλλος επιστήμονας Σαμπολιόν ανακοινώνει ότι επιτέλους αποκρυπτογράφησε τα αρχαία αιγυπτιακά ιερογλυφικά.",
"8-29": "29 Σεπτεμβρίου: Το 1954 ιδρύεται το CERN, ο Ευρωπαϊκός Οργανισμός Πυρηνικής Έρευνας, στη Γενεύη.",
    // ΟΚΤΩΒΡΙΟΣ
"9-2": "2 Οκτωβρίου: Το 1925 ο Τζον Λόγκι Μπερντ πραγματοποιεί την πρώτη επιτυχημένη δοκιμή τηλεοπτικής μετάδοσης.",
"9-4": "4 Οκτωβρίου: Το 1957 ξεκινά η διαστημική εποχή, όταν η Σοβιετική Ένωση εκτοξεύει επιτυχώς τον Σπούτνικ 1, τον πρώτο δορυφόρο.",
"9-6": "6 Οκτωβρίου: Το 1995 ανακαλύπτεται ο πρώτος εξωπλανήτης (51 Pegasi b) που περιστρέφεται γύρω από ένα άστρο σαν τον Ήλιο μας.",
"9-8": "8 Οκτωβρίου: Το 1958 ο Σουηδός χειρουργός Άκε Σένινγκ εμφυτεύει τον πρώτο καρδιακό βηματοδότη σε ασθενή.",
"9-9": "9 Οκτωβρίου: Το 1874 ιδρύεται η Παγκόσμια Ταχυδρομική Ένωση, διευκολύνοντας την ανταλλαγή γραμμάτων μεταξύ διαφορετικών χωρών.",
"9-12": "12 Οκτωβρίου: Το 1492 οι ναύτες του Χριστόφορου Κολόμβου βλέπουν επιτέλους στεριά, φτάνοντας στην αμερικανική ήπειρο.",
"9-13": "13 Οκτωβρίου: Το 1884 ορίζεται ο μεσημβρινός του Γκρίνουιτς ως το σημείο μηδέν (0°) για τη μέτρηση του γεωγραφικού μήκους.",
"9-14": "14 Οκτωβρίου: Το 1947 ο αεροπόρος Τσακ Γιέγκερ γίνεται ο πρώτος άνθρωπος που πετάει πιο γρήγορα από την ταχύτητα του ήχου.",
"9-16": "1912: Η Κατερίνη απελευθερώνεται από τον τουρκικό ζυγό μετά από μάχη στη θέση 'Σβορώνου'.",
"9-18": "18 Οκτωβρίου: Το 1922 ιδρύεται το βρετανικό δίκτυο BBC, που αργότερα έγινε ένας από τους μεγαλύτερους ραδιοτηλεοπτικούς οργανισμούς στον κόσμο.",
"9-19": "19 Οκτωβρίου: Το 1943 ανακαλύπτεται η στρεπτομυκίνη, το πρώτο αντιβιοτικό που μπόρεσε να θεραπεύσει τη δύσκολη ασθένεια της φυματίωσης.",
"9-22": "22 Οκτωβρίου: Το 1938 βγαίνει στην αγορά το πρώτο φωτοτυπικό μηχάνημα (ξηρογραφία) από τον Τσέστερ Κάρλσον.",
"9-23": "23 Οκτωβρίου: Το 2001 η Apple ανακοινάζει το πρώτο iPod, αλλάζοντας ριζικά τη βιομηχανία της ψηφιακής μουσικής.",
"9-24": "24 Οκτωβρίου: Το 1945 ξεκινά επίσημα η λειτουργία του Οργανισμού Ηνωμένων Εθνών (ΟΗΕ) για τη διαφύλαξη της ειρήνης.",
"9-27": "27 Οκτωβρίου: Το 1904 ανοίγει επίσημα το Μετρό της Νέας Υόρκης, ένα από τα παλαιότερα δίκτυα μεταφορών.",
"9-28": "28 Οκτωβρίου: Το 1886 γίνονται τα εγκαίνια του Αγάλματος της Ελευθερίας στη Νέα Υόρκη, που ήταν δώρο του γαλλικού λαού.",
    // ΝΟΕΜΒΡΙΟΣ
"10-3": "3 Νοεμβρίου: Το 1957 η σκυλίτσα Λάικα γράφει ιστορία ως το πρώτο ζώο που στάλθηκε από τους ανθρώπους σε τροχιά στο διάστημα.",
"10-4": "4 Νοεμβρίου: Το 2001 κάνει πρεμιέρα στο Λονδίνο η πρώτη ταινία με τις περιπέτειες του νεαρού μάγου Χάρι Πότερ.",
"10-5": "5 Νοεμβρίου: Το 2007 ανακοινώνεται το λειτουργικό σύστημα Android, που σήμερα χρησιμοποιείται στα περισσότερα κινητά τηλέφωνα παγκοσμίως.",
"10-7": "7 Νοεμβρίου: Το 1867 γεννιέται η Μαρία Κιουρί, η πρώτη γυναίκα που κέρδισε Νόμπελ και η μοναδική σε δύο διαφορετικές επιστήμες (Φυσική, Χημεία).",
"10-8": "8 Νοεμβρίου: Το 1895 ο επιστήμης Βίλχελμ Ρέντγκεν ανακαλύπτει τις ακτίνες Χ, επιτρέποντας στους γιατρούς να βλέπουν μέσα στο σώμα.",
"10-9": "9 Νοεμβρίου: Το 1989 πέφτει το Τείχος του Βερολίνου, ένα ιστορικό γεγονός-ορόσημο για την ενοποίηση της Ευρώπης.",
"10-11": "11 Νοεμβρίου: Το 1918 υπογράφεται η συνθήκη ανακωχής που βάζει τέλος στον καταστροφικό Πρώτο Παγκόσμιο Πόλεμο.",
"10-14": "14 Νοεμβρίου: Το 1969 ξεκινά η αποστολή Apollo 12, η οποία έστειλε τους επόμενους αστροναύτες να περπατήσουν στη Σελήνη.",
"10-15": "15 Νοεμβρίου: Το 1971 κυκλοφορεί ο Intel 4004, ο πρώτος εμπορικά διαθέσιμος μικροεπεξεργαστής στον κόσμο.",
"10-18": "18 Νοεμβρίου: Το 1928 ο διάσημος ποντικός Μίκυ Μάους εμφανίζεται επισήμως στο κοινό, στην κλασική ταινία «Steamboat Willie».",
"10-21": "21 Νοεμβρίου: Το 1783 γίνεται η πρώτη ελεύθερη πτήση ανθρώπων με αερόστατο, πετώντας πάνω από τις στέγες του Παρισιού.",
"10-22": "22 Νοεμβρίου: Το 1995 κάνει πρεμιέρα το «Toy Story», η πρώτη μεγάλου μήκους ταινία που δημιουργήθηκε εξ ολοκλήρου με γραφικά υπολογιστή (CGI).",
"10-24": "24 Νοεμβρίου: Το 1859 ο Άγγλος φυσιοδίφης Κάρολος Δαρβίνος εκδίδει το μνημειώδες βιβλίο του, «Η Καταγωγή των Ειδών».",
"10-25": "25 Νοεμβρίου: Το 1915 ο Άλμπερτ Αϊνστάιν παρουσιάζει την περίφημη Γενική Θεωρία της Σχετικότητας.",
"10-26": "1912: Η Θεσσαλονίκη απελευθερώνεται από τον Ελληνικό Στρατό.",
"10-30": "30 Νοεμβρίου: Το 1609 ο Γαλιλαίος στρέφει για πρώτη φορά το τηλεσκόπιό του στο φεγγάρι και παρατηρεί τους κρατήρες του.",

// ΔΕΚΕΜΒΡΙΟΣ
"11-1": "1 Δεκεμβρίου: Το 1913 ο Χένρι Φορντ ξεκινά την πρώτη γραμμή συναρμολόγησης, κατασκευάζοντας αυτοκίνητα πιο γρήγορα και πιο φθηνά.",
"11-2": "2 Δεκεμβρίου: Το 1942 ο Ενρίκο Φέρμι πραγματοποιεί στο Σικάγο την πρώτη ελεγχόμενη πυρηνική αλυσιδωτή αντίδραση.",
"11-3": "3 Δεκεμβρίου: Το 1967 ο γιατρός Κρίστιαν Μπάρναρντ πραγματοποιεί με επιτυχία την πρώτη μεταμόσχευση ανθρώπινης καρδιάς στη Νότια Αφρική.",
"11-4": "4 Δεκεμβρίου: Το 1998 λανσάρεται ο Διεθνής Διαστημικός Σταθμός (ISS) με την ένωση των πρώτων δύο τμημάτων του στο διάστημα.",
"11-5": "5 Δεκεμβρίου: Το 1901 γεννιέται ο Γουόλτ Ντίσνεϊ, ο οραματιστής δημιουργός που έδωσε ζωή στα πιο αγαπημένα κινούμενα σχέδια.",
"11-8": "8 Δεκεμβρίου: Το 1980 δολοφονείται ο Τζον Λένον, θρυλικό μέλος των Beatles και υποστηρικτής της παγκόσμιας ειρήνης.",
"11-10": "10 Δεκεμβρίου: Το 1901 απονέμονται τα πρώτα βραβεία Νόμπελ στη Σουηδία, τιμώντας σπουδαίους επιστήμονες και ειρηνιστές.",
"11-12": "12 Δεκεμβρίου: Το 1901 ο Γουλιέλμος Μαρκόνι λαμβάνει το πρώτο υπερατλαντικό ασύρματο ραδιοφωνικό σήμα.",
"11-13": "13 Δεκεμβρίου: Το 1972 οι αστροναύτες του Apollo 17 κάνουν τον τελευταίο περίπατο ανθρώπου στο φεγγάρι μέχρι και σήμερα.",
"11-15": "15 Δεκεμβρίου: Το 2001 ο Πύργος της Πίζας ανοίγει ξανά για το κοινό μετά από 11 χρόνια αυστηρών εργασιών σταθεροποίησης.",
"11-17": "17 Δεκεμβρίου: Το 1903 τα αδέλφια Ράιτ καταφέρνουν το αδύνατο: πετούν για 12 δευτερόλεπτα με το πρώτο μηχανοκίνητο αεροπλάνο.",
"11-18": "18 Δεκεμβρίου: Το 1856 γεννιέται ο Τζόζεφ Τζον Τόμσον, ο διακεκριμένος φυσικός που ανακάλυψε το ηλεκτρόνιο.",
"11-20": "20 Δεκεμβρίου: Το 1990 ο Τιμ Μπέρνερς-Λι δημοσιεύει την πρώτη ιστοσελίδα (website) στην ιστορία του διαδικτύου.",
"11-21": "21 Δεκεμβρίου: Το 1968 εκτοξεύεται το Apollo 8, το πρώτο διαστημόπλοιο με πλήρωμα που ταξίδεψε και έκανε τον γύρο της Σελήνης.",
"11-23": "23 Δεκεμβρίου: Το 1947 παρουσιάζεται το τρανζίστορ, η εφεύρεση-κλειδί που έκανε δυνατή τη σύγχρονη ηλεκτρονική.",
"11-27": "27 Δεκεμβρίου: Το 1571 γεννιέται ο Γιοχάνες Κέπλερ, ο σπουδαίος μαθηματικός και αστρονόμος που διατύπωσε τους νόμους της κίνησης των πλανητών.",
"11-28": "28 Δεκεμβρίου: Το 1895 οι αδελφοί Λιμιέρ οργανώνουν στο Παρίσι την πρώτη δημόσια προβολή κινηματογράφου με εισιτήριο.",
"11-30": "30 Δεκεμβρίου: Το 1924 ο αστρονόμος Έντουιν Χαμπλ ανακοινώνει ότι υπάρχουν και άλλοι γαλαξίες πέρα από τον δικό μας (Milky Way).",
// === ΝΕΑ ΚΕΝΑ - ΙΑΝΟΥΑΡΙΟΣ (0) ===
  "0-7": "7 Ιανουαρίου: Το 1610 ο Γαλιλαίος ανακαλύπτει με το τηλεσκόπιό του τους τέσσερις μεγαλύτερους δορυφόρους του πλανήτη Δία.",
  "0-13": "13 Ιανουαρίου: Το 1958 κάνει την πρώτη του εμφάνιση σε παιδικό βιβλίο ο αγαπημένος αρκούδος Πάντινγκτον.",
  "0-21": "21 Ιανουαρίου: Το 1976 το εντυπωσιακό υπερηχητικό αεροπλάνο Κονκόρντ (Concorde) ξεκινά τις πρώτες του πτήσεις με επιβάτες.",
  "0-26": "26 Ιανουαρίου: Το 1905 ανακαλύπτεται στη Νότια Αφρική το μεγαλύτερο διαμάντι του κόσμου, με το όνομα Κάλιναν.",
  "0-29": "29 Ιανουαρίου: Το 1886 ο Καρλ Μπεντς παίρνει το δίπλωμα ευρεσιτεχνίας για το πρώτο αυτοκίνητο που κινούνταν με βενζίνη.",

  // === ΝΕΑ ΚΕΝΑ - ΦΕΒΡΟΥΑΡΙΟΣ (1) ===
  "1-13": "13 Φεβρουαρίου: Το 1895 οι αδελφοί Λιμιέρ παίρνουν την έγκριση για τον «Κινηματογράφο», τη μηχανή που προβάλλει ταινίες.",
  "1-16": "16 Φεβρουαρίου: Το 1923 ο αρχαιολόγος Χάουαρντ Κάρτερ ανοίγει στην Αίγυπτο τον μυστικό τάφο του Φαραώ Τουταγχαμών.",
  "1-17": "17 Φεβρουαρίου: Το 1827 πεθαίνει ο Γιόχαν Πεσταλότσι, ο σπουδαίος δάσκαλος που υποστήριξε ότι τα παιδιά μαθαίνουν καλύτερα παίζοντας.",
  "1-20": "20 Φεβρουαρίου: Το 1962 ο Τζον Γκλεν γίνεται ο πρώτος Αμερικανός αστροναύτης που κάνει τον γύρο της Γης με το διαστημόπλοιό του.",
  "1-21": "21 Φεβρουαρίου: Το 1878 ο Τόμας Έντισον εφευρίσκει τον φωνόγραφο, το πρώτο μηχάνημα που μπορούσε να ηχογραφήσει και να παίξει ήχο!",
  "1-24": "24 Φεβρουαρίου: Το 1582 ανακοινώνεται το «Γρηγοριανό Ημερολόγιο», το οποίο είναι αυτό ακριβώς που χρησιμοποιούμε μέχρι και σήμερα.",
  "1-26": "26 Φεβρουαρίου: Το 1815 ο διάσημος Γάλλος στρατηγός Ναπολέων καταφέρνει να δραπετεύσει από την εξορία του στο νησί Έλβα.",
  "1-29": "29 Φεβρουαρίου: Το 1504 ο Χριστόφορος Κολόμβος χρησιμοποιεί τις γνώσεις του για την έκλειψη της σελήνης για να εντυπωσιάσει τους ιθαγενείς.",

  // === ΝΕΑ ΚΕΝΑ - ΜΑΡΤΙΟΣ (2) ===
  "2-8": "8 Μαρτίου: Το 1979 φτάνουν στη Γη οι πρώτες κοντινές φωτογραφίες από τους εντυπωσιακούς δακτυλίους του πλανήτη Δία.",
  "2-11": "11 Μαρτίου: Το 1955 φεύγει από τη ζωή ο Αλεξάντερ Φλέμινγκ, ο επιστήμονας που ανακάλυψε την πενικιλίνη και έσωσε εκατομμύρια ανθρώπους.",
  "2-16": "16 Μαρτίου: Το 1521 ο σπουδαίος εξερευνητής Μαγγελάνος φτάνει στις Φιλιππίνες στο μεγάλο ταξίδι του γύρω από τον κόσμο.",
  "2-27": "27 Μαρτίου: Το 1899 ο Γουλιέλμος Μαρκόνι καταφέρνει να στείλει το πρώτο ασύρματο μήνυμα πάνω από τη θάλασσα της Μάγχης.",
  "2-30": "30 Μαρτίου: Το 1858 ο Χάιμεν Λίπμαν κατασκευάζει κάτι πανέξυπνο: το πρώτο μολύβι που είχε ενσωματωμένη γομολάστιχα στο πίσω μέρος!",

  // === ΝΕΑ ΚΕΝΑ - ΑΠΡΙΛΙΟΣ (3) ===
  "3-20": "20 Απριλίου: Το 1902 η σπουδαία επιστήμονας Μαρία Κιουρί καταφέρνει να απομονώσει στο εργαστήριό της το χημικό στοιχείο ράδιο.",
  "3-23": "23 Απριλίου: Το 1616 φεύγουν από τη ζωή δύο μεγάλοι συγγραφείς, ο Ουίλιαμ Σαίξπηρ και ο Μιγκέλ ντε Θερβάντες.",
  "3-26": "26 Απριλίου: Το 1564 βαφτίζεται ο Ουίλιαμ Σαίξπηρ, που θα γινόταν ο πιο διάσημος συγγραφέας θεατρικών έργων στον κόσμο.",
  "3-29": "29 Απριλίου: Το 1913 κατασκευάζεται το πρώτο σύγχρονο φερμουάρ, κάνοντας το ντύσιμο των ανθρώπων πολύ πιο εύκολο.",
  "3-30": "30 Απριλίου: Το 1897 ο φυσικός Τζόζεφ Τζον Τόμσον ανακοινώνει ότι ανακάλυψε το ηλεκτρόνιο, ένα πολύ μικρό σωματίδιο της ύλης.",

  // === ΝΕΑ ΚΕΝΑ - ΜΑΪΟΣ (4) ===
  "4-4": "4 Μαΐου: Το 1904 ξεκινά η κατασκευή της Διώρυγας του Παναμά, ένα τεράστιο έργο για να περνούν τα καράβια από τον έναν ωκεανό στον άλλον.",
  "4-7": "7 Μαΐου: Το 1824 ο διάσημος συνθέτης Μπετόβεν παρουσιάζει για πρώτη φορά τη θρυλική 9η Συμφωνία του.",
  "4-9": "9 Μαΐου: Το 1502 ο εξερευνητής Χριστόφορος Κολόμβος ξεκινά με τα καράβια του το τέταρτο και τελευταίο του ταξίδι για την Αμερική.",
  "4-17": "17 Μαΐου: Το 1902 ο Έλληνας αρχαιολόγος Βαλέριος Στάης ανακαλύπτει τον Μηχανισμό των Αντικυθήρων, τον πρώτο «υπολογιστή» της αρχαιότητας.",
  "4-22": "22 Μαΐου: Το 1906 οι αδελφοί Ράιτ παίρνουν επισήμως το δίπλωμα ευρεσιτεχνίας για την ιπτάμενη μηχανή τους (το αεροπλάνο).",
  "4-26": "26 Μαΐου: Το 1897 κυκλοφορεί στα βιβλιοπωλεία η κλασική ιστορία μυστηρίου «Δράκουλας» του συγγραφέα Μπραμ Στόκερ.",
  "4-30": "30 Μαΐου: Το 1911 διεξάγεται στην Αμερική ο πρώτος ιστορικός αγώνας γρήγορων αυτοκινήτων, το θρυλικό «Ιντιανάπολις 500».",
  "4-31": "31 Μαΐου: Το 1859 το μεγάλο ρολόι Μπιγκ Μπεν (Big Ben) ψηλά στον πύργο του Λονδίνου αρχίζει να χτυπά για πρώτη φορά.",

  // === ΝΕΑ ΚΕΝΑ - ΙΟΥΝΙΟΣ (5) ===
  "5-2": "2 Ιουνίου: Το 1875 ο Αλεξάντερ Γκράχαμ Μπελ κάνει την πρώτη δοκιμή μετάδοσης ήχου που θα οδηγούσε στην ανακάλυψη του τηλεφώνου.",
  "5-17": "17 Ιουνίου: Το 1885 το τεράστιο Άγαλμα της Ελευθερίας φτάνει στη Νέα Υόρκη από τη Γαλλία... διαλυμένο μέσα σε 214 κιβώτια!",
  "5-24": "24 Ιουνίου: Το 1901 ανοίγει στο Παρίσι η πρώτη έκθεση με έργα ζωγραφικής ενός 19χρονου καλλιτέχνη, του Πάμπλο Πικάσο.",
  "5-26": "26 Ιουνίου: Το 1997 κυκλοφορεί το πρώτο βιβλίο της σειράς «Χάρι Πότερ», μαγεύοντας τα παιδιά σε όλο τον κόσμο.",
  "5-29": "29 Ιουνίου: Το 2007 κυκλοφορεί στα καταστήματα το πρώτο κινητό τηλέφωνο iPhone, αλλάζοντας την τεχνολογία.",

  // === ΝΕΑ ΚΕΝΑ - ΙΟΥΛΙΟΣ (6) ===
  "6-11": "11 Ιουλίου: Το 1930 ξεκινά στην Ουρουγουάη το πρώτο Παγκόσμιο Κύπελλο Ποδοσφαίρου, το γνωστό μας Μουντιάλ.",
  "6-13": "13 Ιουλίου: Το 1923 τοποθετείται για πρώτη φορά το διάσημο σήμα με τα μεγάλα γράμματα HOLLYWOOD στους λόφους του Λος Άντζελες.",
  "6-15": "15 Ιουλίου: Το 1799 ανακαλύπτεται στην Αίγυπτο η Στήλη της Ροζέττας, χάρη στην οποία οι επιστήμονες διάβασαν τα αρχαία ιερογλυφικά.",
  "6-19": "19 Ιουλίου: Το 1976 το διαστημικό ρομπότ Viking 1 της NASA προσεδαφίζεται επιτυχώς στην επιφάνεια του Άρη.",
  "6-22": "22 Ιουλίου: Το 1933 ο πιλότος Γουάιλι Ποστ γίνεται ο πρώτος άνθρωπος που πετάει ολομόναχος γύρω από τον κόσμο.",
  "6-23": "23 Ιουλίου: Το 1911 ανακαλύπτεται από εξερευνητές η αρχαία πόλη Μάτσου Πίτσου των Ίνκας, ψηλά στα βουνά του Περού.",
  "6-24": "24 Ιουλίου: Το 1909 ο πιλότος Λουί Μπλεριό καταφέρνει να περάσει με το αεροπλάνο του το στενό της Μάγχης πάνω από τη θάλασσα.",
  "6-25": "25 Ιουλίου: Το 1814 ο μηχανικός Τζορτζ Στίβενσον δοκιμάζει με επιτυχία την πρώτη ατμομηχανή τρένου στις ράγες.",
  "6-27": "27 Ιουλίου: Το 1940 κάνει την πρώτη του εμφάνιση στην τηλεόραση ο Μπαγκς Μπάνι, ο διάσημος λαγός των κινουμένων σχεδίων.",
  "6-28": "28 Ιουλίου: Το 1858 γίνεται η πρώτη επιτυχημένη χρήση των δακτυλικών αποτυπωμάτων για την αναγνώριση ενός ανθρώπου.",

  // === ΝΕΑ ΚΕΝΑ - ΑΥΓΟΥΣΤΟΣ (7) ===
  "7-2": "2 Αυγούστου: Το 1958 το αμερικανικό υποβρύχιο «Ναυτίλος» γίνεται το πρώτο που περνάει κάτω από τους πάγους του Βόρειου Πόλου.",
  "7-7": "7 Αυγούστου: Το 1947 το ξύλινο καράβι «Κον-Τίκι» φτάνει στην Πολυνησία διασχίζοντας τον ωκεανό, ολοκληρώνοντας μια μεγάλη περιπέτεια.",
  "7-8": "8 Αυγούστου: Το 1831 το πρώτο ατμοκίνητο επιβατικό τρένο ξεκινάει τα δρομολόγιά του στην Αμερική.",
  "7-10": "10 Αυγούστου: Το 1519 ο Πορτογάλος θαλασσοπόρος Μαγγελάνος ξεκινά το τεράστιο ταξίδι του για να κάνει τον γύρο της Γης.",
  "7-11": "11 Αυγούστου: Το 1999 συμβαίνει η τελευταία ολική έκλειψη Ηλίου του 20ού αιώνα, προσφέροντας ένα μοναδικό θέαμα.",
  "7-13": "13 Αυγούστου: Το 1889 εφευρίσκεται ο πρώτος τηλεφωνικός κερματοδέκτης, δηλαδή το γνωστό μας καρτοτηλέφωνο με κέρματα.",
  "7-16": "16 Αυγούστου: Το 1896 ανακαλύπτεται χρυσός στο Κλόνταϊκ του Καναδά, ξεκινώντας τον μεγάλο «Πυρετό του Χρυσού».",
  "7-18": "18 Αυγούστου: Το 1868 ο Γάλλος αστρονόμος Πιέρ Ζανσέν ανακαλύπτει το στοιχείο ήλιον παρατηρώντας μια έκλειψη του Ήλιου.",
  "7-19": "19 Αυγούστου: Το 1960 στέλνονται στο διάστημα τα δύο γενναία σκυλάκια Μπέλκα και Στρέλκα και επιστρέφουν σώα πίσω στη Γη!",
  "7-25": "25 Αυγούστου: Το 1609 ο επιστήμονας Γαλιλαίος παρουσιάζει το πρώτο δυνατό τηλεσκόπιο στους έκπληκτους άρχοντες της Βενετίας.",
  "7-30": "30 Αυγούστου: Το 1871 γεννιέται ο Έρνεστ Ράδερφορντ, ο φυσικός που μάς εξήγησε από τι είναι φτιαγμένο το κέντρο του ατόμου.",

  // === ΝΕΑ ΚΕΝΑ - ΣΕΠΤΕΜΒΡΙΟΣ (8) ===
  "8-4": "4 Σεπτεμβρίου: Το 1998 ιδρύεται η διάσημη εταιρεία Google από δύο φοιτητές πανεπιστημίου, τον Λάρι Πέιτζ και τον Σεργκέι Μπριν.",
  "8-8": "8 Σεπτεμβρίου: Το 1522 το καράβι «Βικτώρια», το μόνο που απέμεινε από τον στόλο του Μαγγελάνου, ολοκληρώνει τον γύρο του κόσμου.",
  "8-10": "10 Σεπτεμβρίου: Το 2008 ξεκινάει τη λειτουργία της στην Ελβετία η μεγαλύτερη μηχανή στον κόσμο (ο επιταχυντής CERN).",
  "8-11": "11 Σεπτεμβρίου: Το 1962 η Αμερική ανακοινώνει επίσημα το μεγάλο της σχέδιο να στείλει τον πρώτο άνθρωπο στη Σελήνη.",
  "8-15": "15 Σεπτεμβρίου: Το 1835 το ερευνητικό πλοίο του επιστήμονα Κάρολου Δαρβίνου φτάνει στα εξωτικά νησιά Γκαλαπάγκος.",
  "8-16": "16 Σεπτεμβρίου: Το 1620 το καράβι «Μέιφλαουερ» ξεκινά από την Αγγλία για την Αμερική, μεταφέροντας τους πρώτους ταξιδιώτες.",
  "8-19": "19 Σεπτεμβρίου: Το 1783 σηκώνεται το πρώτο αερόστατο, βάζοντας για επιβάτες ένα πρόβατο, έναν κόκορα και μια πάπια!",
  "8-21": "21 Σεπτεμβρίου: Το 1937 εκδίδεται το αγαπημένο βιβλίο φαντασίας «Το Χόμπιτ» του συγγραφέα Τζ. Ρ. Ρ. Τόλκιν.",
  "8-25": "25 Σεπτεμβρίου: Το 1513 ο εξερευνητής Βάσκο Νούνιες ντε Μπαλμπόα γίνεται ο πρώτος Ευρωπαίος που αντικρίζει τον Ειρηνικό Ωκεανό.",
  "8-26": "26 Σεπτεμβρίου: Το 1580 ο Βρετανός θαλασσοπόρος Φράνσις Ντρέικ επιστρέφει στην πατρίδα του έχοντας κάνει τον γύρο του κόσμου.",
  "8-28": "28 Σεπτεμβρίου: Το 1892 παίζεται ο πρώτος αγώνας ποδοσφαίρου τη νύχτα, χρησιμοποιώντας μεγάλους ηλεκτρικούς προβολείς φωτός.",
  "8-30": "30 Σεπτεμβρίου: Το 1968 το τεράστιο αεροπλάνο Boeing 747 βγαίνει για πρώτη φορά από το εργοστάσιο κατασκευής του.",

  // === ΝΕΑ ΚΕΝΑ - ΟΚΤΩΒΡΙΟΣ (9) ===
  "9-1": "1 Οκτωβρίου: Το 1958 ιδρύεται επίσημα η Αμερικανική Διαστημική Υπηρεσία, γνωστή σε όλους μας ως NASA.",
  "9-3": "3 Οκτωβρίου: Το 1952 κυκλοφορεί το πρώτο περιοδικό κόμικ με τις περιπέτειες του αγαπημένου αρκούδου Ρούπερτ.",
  "9-5": "5 Οκτωβρίου: Το 1962 προβάλλεται στους κινηματογράφους η πρώτη ταινία με τον διάσημο μυστικό πράκτορα Τζέιμς Μποντ.",
  "9-7": "7 Οκτωβρίου: Το 1959 το διαστημικό σκάφος Luna 3 καταφέρνει να βγάλει φωτογραφία τη «σκοτεινή» πίσω πλευρά της Σελήνης.",
  "9-10": "10 Οκτωβρίου: Το 1846 ο Βρετανός αστρονόμος Ουίλιαμ Λάσελ ανακαλύπτει τον Τρίτωνα, το μεγαλύτερο φεγγάρι του πλανήτη Ποσειδώνα.",
  "9-11": "11 Οκτωβρίου: Το 1968 εκτοξεύεται το Apollo 7, το πρώτο διαστημόπλοιο του προγράμματος που θα πήγαινε τον άνθρωπο στο φεγγάρι.",
  "9-15": "15 Οκτωβρίου: Το 1997 εκτοξεύεται το διαστημόπλοιο Cassini-Huygens για το μακρινό του ταξίδι προς τον πλανήτη Κρόνο.",
  "9-17": "17 Οκτωβρίου: Το 1851 κυκλοφορεί το σπουδαίο βιβλίο «Μόμπι Ντικ», που αφηγείται την ιστορία μιας τεράστιας λευκής φάλαινας.",
  "9-20": "20 Οκτωβρίου: Το 1973 εγκαινιάζεται η εντυπωσιακή Όπερα του Σίδνεϊ, το κτίριο με τις λευκές στέγες που μοιάζουν με πανιά πλοίου.",
  "9-21": "21 Οκτωβρίου: Το 1879 ο Τόμας Έντισον καταφέρνει να κρατήσει αναμμένη μια ηλεκτρική λάμπα για περισσότερες από 13 ώρες.",
  "9-25": "25 Οκτωβρίου: Το 1881 γεννιέται ο Πάμπλο Πικάσο, ο οποίος μεγάλωσε και έγινε ένας από τους πιο διάσημους ζωγράφους του κόσμου.",
  "9-26": "26 Οκτωβρίου: Το 1863 ιδρύεται στο Λονδίνο η πρώτη Ποδοσφαιρική Ομοσπονδία, γράφοντας τους πρώτους κανόνες του αθλήματος.",
  "9-29": "29 Οκτωβρίου: Το 1969 δύο υπολογιστές στέλνουν το πρώτο μήνυμα μεταξύ τους στο δίκτυο ARPANET, τον πρόγονο του διαδικτύου.",
  "9-30": "30 Οκτωβρίου: Το 1938 μια ραδιοφωνική εκπομπή για εξωγήινους ακουγόταν τόσο αληθινή, που οι ακροατές πίστεψαν ότι έγινε εισβολή!",
  "9-31": "31 Οκτωβρίου: Το 1925 ο διάσημος μάγος Χάρι Χουντίνι κάνει ένα από τα πιο δύσκολα κόλπα απόδρασης της καριέρας του.",

  // === ΝΕΑ ΚΕΝΑ - ΝΟΕΜΒΡΙΟΣ (10) ===
  "10-1": "1 Νοεμβρίου: Το 1894 αρχίζει να εκδίδεται στο Παρίσι το αγαπημένο περιοδικό ιστοριών και κόμικ «Le Petit Journal».",
  "10-2": "2 Νοεμβρίου: Το 1936 ξεκινάει τις εκπομπές του στο Λονδίνο το πρώτο τηλεοπτικό κανάλι υψηλής ποιότητας (BBC).",
  "10-6": "6 Νοεμβρίου: Το 1869 διεξάγεται στην Αμερική ο πρώτος ιστορικός αγώνας αμερικανικού ποδοσφαίρου ανάμεσα σε δύο πανεπιστήμια.",
  "10-10": "10 Νοεμβρίου: Το 1969 η διάσημη παιδική εκπομπή με κούκλες «Sesame Street» (Σουσάμι Άνοιξε) κάνει πρεμιέρα στην τηλεόραση.",
  "10-12": "12 Νοεμβρίου: Το 1980 το ρομποτικό διαστημόπλοιο Voyager 1 περνά πολύ κοντά από τον πλανήτη Κρόνο και βγάζει φωτογραφίες.",
  "10-13": "13 Νοεμβρίου: Το 1971 το διαστημόπλοιο Mariner 9 γίνεται το πρώτο ανθρώπινο σκάφος που μπαίνει σε τροχιά γύρω από τον Άρη.",
  "10-16": "16 Νοεμβρίου: Το 1869 ανοίγει η Διώρυγα του Σουέζ, επιτρέποντας στα πλοία να περνούν γρήγορα από τη Μεσόγειο στην Ασία.",
  "10-17": "17 Νοεμβρίου: Το 1970 ο εφευρέτης Ντάγκλας Ένγκελμπαρτ παίρνει το δίπλωμα ευρεσιτεχνίας για το γνωστό μας «ποντίκι» υπολογιστή.",
  "10-19": "19 Νοεμβρίου: Το 1493 ο εξερευνητής Χριστόφορος Κολόμβος ανακαλύπτει το όμορφο νησί του Πουέρτο Ρίκο.",
  "10-20": "20 Νοεμβρίου: Το 1985 κυκλοφορεί από την εταιρεία Microsoft το πρώτο λειτουργικό σύστημα Windows για τους υπολογιστές.",
  "10-23": "23 Νοεμβρίου: Το 1889 τοποθετείται σε ένα κατάστημα στο Σαν Φρανσίσκο το πρώτο αυτόματο μηχάνημα μουσικής (Τζουκ-Μποξ).",
  "10-27": "27 Νοεμβρίου: Το 1520 ο Μαγγελάνος και ο στόλος του βγαίνουν στον Ειρηνικό Ωκεανό, ονομάζοντάς τον έτσι επειδή ήταν πολύ ήρεμος.",
  "10-28": "28 Νοεμβρίου: Το 1929 ο πιλότος Ρίτσαρντ Μπερντ γίνεται ο πρώτος άνθρωπος που πετάει με αεροπλάνο πάνω από τον Νότιο Πόλο!",
  "10-29": "29 Νοεμβρίου: Το 1972 κυκλοφορεί το θρυλικό «Pong», ένα από τα πρώτα βιντεοπαιχνίδια όπου παίζεις ηλεκτρονικό τένις με ρακετάκια.",

  // === ΝΕΑ ΚΕΝΑ - ΔΕΚΕΜΒΡΙΟΣ (11) ===
  "11-6": "6 Δεκεμβρίου: Το 1972 ξεκινά το ταξίδι του το Apollo 17, που ήταν η τελευταία φορά που ταξίδεψαν άνθρωποι στη Σελήνη.",
  "11-7": "7 Δεκεμβρίου: Το 1732 ανοίγει τις πόρτες της στο Λονδίνο η υπέροχη Βασιλική Όπερα του Κόβεντ Γκάρντεν.",
  "11-9": "9 Δεκεμβρίου: Το 1968 παρουσιάζεται για πρώτη φορά στο κοινό ένας υπολογιστής που δούλευε με... ποντίκι!",
  "11-11": "11 Δεκεμβρίου: Το 1901 φτάνει με επιτυχία το πρώτο ασύρματο μήνυμα στην άλλη άκρη του Ατλαντικού Ωκεανού (το γράμμα S σε μορς).",
  "11-14": "14 Δεκεμβρίου: Το 1911 ο εξερευνητής Ρόαλντ Αμούνδσεν και η ομάδα του γίνονται οι πρώτοι άνθρωποι που πατούν στον Νότιο Πόλο.",
  "11-16": "16 Δεκεμβρίου: Το 1770 γεννιέται ο Λούντβιχ βαν Μπετόβεν, ένας από τους σπουδαιότερους δημιουργούς κλασικής μουσικής.",
  "11-19": "19 Δεκεμβρίου: Το 1958 ο πρώτος δορυφόρος επικοινωνίας εκπέμπει από το διάστημα ένα χριστουγεννιάτικο μήνυμα ειρήνης.",
  "11-22": "22 Δεκεμβρίου: Το 1938 οι επιστήμονες ανακαλύπτουν στον ωκεανό ένα ζωντανό ψάρι «Κοιλάκανθο», ενώ νόμιζαν ότι είχε εξαφανιστεί μαζί με τους δεινόσαυρους!",
  "11-24": "24 Δεκεμβρίου: Το 1968 οι αστροναύτες του Apollo 8 τραβούν την πιο διάσημη φωτογραφία της Γης καθώς «ανατέλλει» πίσω από το φεγγάρι.",
  "11-25": "25 Δεκεμβρίου: Το 1822 γεννιέται ο Λουί Παστέρ, ο επιστήμονας που βρήκε τον τρόπο να προστατεύει τα τρόφιμά μας από τα μικρόβια.",
  "11-26": "26 Δεκεμβρίου: Το 1898 οι επιστήμονες Πιέρ και Μαρία Κιουρί ανακοινώνουν επίσημα ότι ανακάλυψαν ένα νέο στοιχείο, το ράδιο.",
  "11-29": "29 Δεκεμβρίου: Το 1852 γεννιέται ο φυσικός Άλμπερτ Μάικελσον, ο οποίος κατάφερε να μετρήσει με μεγάλη ακρίβεια πόσο γρήγορα ταξιδεύει το φως.",
  "11-31": "31 Δεκεμβρίου: Το 1879 ο Τόμας Έντισον ανάβει δημόσια για πρώτη φορά τους νέους του ηλεκτρικούς λαμπτήρες, φωτίζοντας τη νύχτα."

    },

    missions: {
      space: [
        "Γίνε αστρονόμος! Απόψε το βράδυ, κοίτα τον ουρανό και προσπάθησε να εντοπίσεις το πιο φωτεινό αστέρι ή το φεγγάρι.",
        "Σχεδίασε σε ένα πρόχειρο χαρτί τον δικό σου πύραυλο. Τι τρελό όνομα θα του έδινες;",
        "Αν συναντούσες έναν εξωγήινο, ποια θα ήταν η πρώτη λέξη που θα του μάθαινες στη γλώσσα μας;",
        "Περπάτησε στο δωμάτιο σε αργή κίνηση, σαν να βρίσκεσαι στο φεγγάρι και δεν υπάρχει βαρύτητα!",
        "Φτιάξε έναν δικό σου φανταστικό αστερισμό ενώνοντας 5 τελείες στο χαρτί. Τι σχήμα βγήκε;",
        "Αν ταξίδευες στον Άρη και χωρούσαν μόνο 3 πράγματα στο σακίδιό σου, ποια θα ήταν αυτά;",
        "Φαντάσου ότι ανακαλύπτεις έναν νέο πλανήτη. Τι χρώμα θα είχε και από τι θα ήταν φτιαγμένος;",
        "Ζωγράφισε τον Ήλιο, αλλά αντί για κίτρινο, δώσε του τα χρώματα που σου αρέσουν περισσότερο.",
        "Κάνε την αντίστροφη μέτρηση (10, 9, 8...) και κάνε αναπαράσταση μιας εκτόξευσης!",
        "Φτιάξε έναν μικρό 'δορυφόρο' χρησιμοποιώντας λίγο αλουμινόχαρτο από την κουζίνα.",
        "Πόσα δευτερόλεπτα μπορείς να κρατήσεις την αναπνοή σου, σαν να βρίσκεσαι στο κενό του διαστήματος;",
        "Κλείσε τα μάτια και φαντάσου τον ήχο που κάνει ένας τεράστιος πύραυλος. Κάνε τον ήχο με το στόμα σου!"
      ],
      tech: [
        "Ώρα για πείραμα! Πάρε έναν πλαστικό χάρακα, τρίψε τον στα μαλλιά σου και δες αν σηκώνει μικρά χαρτάκια.",
        "Σκέψου ένα μικρό πρόβλημα στο δωμάτιό σου. Ποια τρελή εφεύρεση θα έφτιαχνες για να το λύσεις;",
        "Προσπάθησε να περάσεις την επόμενη 1 ώρα χωρίς να κοιτάξεις απολύτως καμία ηλεκτρονική οθόνη!",
        "Φαντάσου ότι φτιάχνεις ένα μικρό, ξύλινο ρομπότ-μασκότ για την τάξη. Τι σχήμα θα είχε το κεφάλι του;",
        "Βρες στο σπίτι την πιο παλιά ηλεκτρική συσκευή. Πόσο νομίζεις ότι μοιάζει με τις σημερινές;",
        "Φτιάξε ένα κρυπτογραφημένο μήνυμα, γράφοντας τις λέξεις ανάποδα και δώστο σε κάποιον να το διαβάσει.",
        "Ζωγράφισε το αυτοκίνητο του μέλλοντος! Θα πετάει; Θα πηγαίνει κάτω από το νερό;",
        "Γίνε μηχανικός: Προσπάθησε να φτιάξεις μια μικρή γέφυρα χρησιμοποιώντας μόνο 3 βιβλία και 1 μολύβι.",
        "Τι θα έκανες σήμερα αν ξαφνικά κοβόταν το ρεύμα για όλη την υπόλοιπη μέρα;",
        "Βάλε ένα τραγούδι να παίζει και δοκίμασε να χτυπήσεις τον ρυθμό του σαν να στέλνεις σήμα Μορς στο τραπέζι.",
        "Αν μπορούσες να προσθέσεις ένα μαγικό κουμπί στο τηλέφωνό σου, τι θα έκανε όταν το πατούσες;",
        "Σχεδίασε ένα ιπτάμενο ποδήλατο! Τι θα χρειαζόταν για να μπορέσει να σηκωθεί από το έδαφος;"
      ],
      arts: [
        "Γίνε συγγραφέας! Γράψε στο τετράδιό σου μια μικρή ιστορία μυστηρίου χρησιμοποιώντας μόνο 3 προτάσεις.",
        "Φτιάξε μια ζωγραφιά χρησιμοποιώντας μόνο γεωμετρικά σχήματα (τρίγωνα, κύκλους), όπως ο Πικάσο!",
        "Ποιος είναι ο αγαπημένος σου ήρωας κινουμένων σχεδίων; Κάνε μια αστεία μίμηση της φωνής του.",
        "Τραγούδησε το ρεφρέν του αγαπημένου σου τραγουδιού... αλλά με φωνή οπερατικού τραγουδιστή!",
        "Δοκίμασε να γράψεις το μικρό σου όνομα σε ένα χαρτί χρησιμοποιώντας το άλλο σου χέρι.",
        "Παίξε παντομίμα! Προσπάθησε να περιγράψεις χωρίς λόγια το σημερινό ιστορικό γεγονός σε κάποιον.",
        "Γίνε γραφίστας: Σχεδίασε ένα ολοκαίνουργιο, δικό σου λογότυπο που να έχει το αρχικό σου γράμμα.",
        "Χόρεψε για 30 δευτερόλεπτα σαν να είσαι ένα ρομπότ που μόλις του έβαλαν μπαταρίες.",
        "Χώρισε ένα χαρτί στα τρία και φτιάξε ένα γρήγορο κόμικ με 3 κουτάκια για κάτι αστείο που έγινε σήμερα.",
        "Αν η σημερινή μέρα ήταν ταινία, τι τίτλο θα της έδινες και ποιος θα έπαιζε τον πρωταγωνιστή;",
        "Φτιάξε ένα μικρό ποιηματάκι 2 σειρών που να κάνει ρίμα, με θέμα τον σημερινό καιρό.",
        "Ζωγράφισε το εξώφυλλο ενός βιβλίου που δεν έχει γραφτεί ακόμα, αλλά θα ήθελες πολύ να διαβάσεις!"
      ],
      history: [
        "Γίνε εξερευνητής του σπιτιού! Κρύψε ένα αντικείμενο, φτιάξε έναν χάρτη και δώστον σε κάποιον να το βρει.",
        "Αν είχες μια χρονομηχανή, σε ποια εποχή της ιστορίας θα ήθελες να ταξιδέψεις για μια μέρα;",
        "Ρώτησε έναν γονιό ή παππού να σου πει μια ιστορία για το πώς ήταν η γειτονιά σας όταν ήταν παιδί.",
        "Γίνε Βασιλιάς/Βασίλισσα για 1 λεπτό: Ποιος θα ήταν ο πρώτος καλός νόμος που θα έβαζες στη χώρα σου;",
        "Φτιάξε ένα γρήγορο στέμμα από χαρτί, ζωγράφισέ το και φόρεσέ το!",
        "Φαντάσου ότι είσαι γενναίος ιππότης. Σχεδίασε τον θυρεό (το σήμα) που θα είχε η ασπίδα σου.",
        "Τι φαγητό πιστεύεις ότι θα έτρωγαν τα παιδιά στην Αρχαία Ελλάδα για πρωινό;",
        "Βρες μια παλιά φωτογραφία στο σπίτι. Προσπάθησε να μαντέψεις τι σκεφτόταν ο άνθρωπος που πόζαρε.",
        "Σκέψου μια διαφωνία που είχες πρόσφατα. Πώς θα μπορούσες να την έχεις λύσει σαν σωστός διπλωμάτης;",
        "Ζωγράφισε ένα ψηλό κάστρο με γέφυρα. Ποιος ζει εκεί μέσα;",
        "Αν ζούσες πριν 200 χρόνια, χωρίς αυτοκίνητα, πώς θα πήγαινες μέχρι το σχολείο;",
        "Σκέψου 3 ερωτήσεις που θα έκανες σε έναν άνθρωπο που έζησε κατά τη διάρκεια της Γαλλικής Επανάστασης."
      ],
      exploration: [
        "Προς τα πού πέφτει ο Βορράς; Προσπάθησε να μαντέψεις πού είναι τα σημεία του ορίζοντα στο δωμάτιό σου.",
        "Ζωγράφισε ένα εντυπωσιακό πειρατικό ή εξερευνητικό καράβι με μεγάλα πανιά.",
        "Ανακάλυψες ένα νέο νησί στον ωκεανό! Σχεδίασε γρήγορα τον χάρτη του και δώσε του όνομα.",
        "Γίνε ναυτικός: Προσπάθησε να δέσεις έναν γερό κόμπο με ένα κορδόνι από το παπούτσι σου.",
        "Κλείσε τα μάτια και περπάτα από τη μια άκρη του δωματίου στην άλλη (με προσοχή!). Ήταν εύκολο;",
        "Σχεδίασε μια σημαία για τη δική σου φανταστική ομάδα εξερευνητών.",
        "Τι θα έβαζες σε ένα σακίδιο αν ξεκινούσες για ορειβασία στα Ιμαλάια;",
        "Φτιάξε ένα καραβάκι από χαρτί και δες αν μπορεί να επιπλεύσει σε μια λεκάνη με νερό.",
        "Βρες 3 διαφορε χώρες σε έναν χάρτη ή υδρόγειο σφαίρα (αν έχεις). Ποια είναι η πιο μακρινή;",
        "Πώς λένε γεια στην άλλη άκρη του κόσμου; Ψάξε να βρεις πώς χαιρετάνε στην Ιαπωνία!",
        "Ζωγράφισε ένα πανύψηλο χιονισμένο βουνό. Τι υπάρχει πίσω από την κορυφή του;",
        "Φαντάσου ότι είσαι καπετάνιος. Φώναξε μια δυνατή εντολή στο (φανταστικό) πλήρωμά σου!"
      ],
      science: [
        "Πόσο ψηλός/ή είσαι... σε παλάμες; Μέτρα το ύψος σου βάζοντας τη μια παλάμη πάνω στην άλλη!",
        "Αν ανακατέψεις μπλε με κίτρινο χρώμα, τι βγαίνει; Δοκίμασε το με τις ξυλομπογιές ή τους μαρκαδόρους σου.",
        "Πάρε ένα μολύβι και προσπάθησε να το ισορροπήσεις οριζόντια στο ένα σου δάχτυλο (το κέντρο βάρους!).",
        "Βάλε το χέρι σου στην καρδιά. Πόσο γρήγορα χτυπάει; Κάνε 10 επιτόπια πηδηματάκια και ξαναμέτρα!",
        "Γίνε ντετέκτιβ: Πάρε έναν μεγεθυντικό φακό (ή φτιάξε έναν σταγόνα νερό σε διάφανο πλαστικό) και δες μια κλωστή.",
        "Βάλε έναν φακό (από το κινητό ίσως) να ρίχνει φως στον τοίχο και φτιάξε μια αστεία σκιά με τα χέρια σου.",
        "Μπορείς να λύσεις έναν γρίφο; 'Τι μεγαλώνει όταν τρώει, αλλά πεθαίνει όταν πίνει νερό;' (Η φωτιά!)",
        "Βρες ένα αντικείμενο στο δωμάτιο που να μαγνητίζεται (αν έχεις ένα μαγνητάκι ψυγείου).",
        "Κοίτα έξω τα σύννεφα. Βλέπεις κάποιο που να μοιάζει με ζώο ή αντικείμενο;",
        "Πείραμα στο νερό: Βάλε ένα κέρμα και ένα πλαστικό καπάκι σε νερό. Ποιο βουλιάζει και ποιο επιπλέει;",
        "Μέτρα μέχρι το 10 στο μυαλό σου, προσπαθώντας να υπολογίσεις ακριβώς 1 δευτερόλεπτο τη φορά.",
        "Ζωγράφισε τον διάσημο φυσικό Άλμπερτ Αϊνστάιν, μην ξεχάσεις τα τρελά του μαλλιά!"
      ],
      biology: [
        "Βγες έξω (ή στο μπαλκόνι) και βρες 3 διαφορετικά σχήματα από φύλλα φυτών.",
        "Άκουσε τη φύση: Κλείσε τα μάτια για 30 δευτερόλεπτα με το παράθυρο ανοιχτό. Πόσους ήχους άκουσες;",
        "Ζωγράφισε έναν τρομακτικό αλλά αστείο δεινόσαυρο! Τι χρώμα νομίζεις ότι είχαν τελικά;",
        "Αν ήσουν δέντρο, πώς θα ένιωθες τον χειμώνα; Κάνε τα χέρια σου κλαδιά στον αέρα!",
        "Προσπάθησε να σταθείς στο ένα πόδι σαν φλαμίνγκο για 20 δευτερόλεπτα χωρίς να πέσεις.",
        "Ζωγράφισε ένα μικρόβιο μέσα από το 'μικροσκόπιό' σου. Βάλτου και αστεία μάτια!",
        "Ξέρεις πόσα οστά έχει ο άνθρωπος; (Περίπου 206!). Προσπάθησε να ψηλαφίσεις 5 διαφορετικά.",
        "Πάρε 3 πολύ βαθιές αναπνοές (μέσα από τη μύτη, έξω από το στόμα) για να γεμίσεις τους πνεύμονές σου οξυγόνο.",
        "Ζωγράφισε το αγαπημένο σου ζώο. Ποιο είναι το πιο έξυπνο χαρακτηριστικό που έχει για να επιβιώνει;",
        "Φαντάσου ότι είσαι αετός. Άνοιξε τα 'φτερά' σου και κάνε έναν κύκλο στο δωμάτιο.",
        "Σκέψου ένα υγιεινό σνακ που θα σου έδινε ενέργεια. Ζωγράφισέ το στο τετράδιό σου.",
        "Δείξε πώς πλένουμε σωστά τα χέρια μας με (φανταστικό) σαπούνι για 20 δευτερόλεπτα!"
      ],
      sports: [
        "Κάνε αμέσως 10 επιτόπια πηδηματάκια για να ξυπνήσεις το σώμα σου!",
        "Προσπάθησε να ισορροπήσεις ένα βιβλίο στο κεφάλι σου και να κάνεις 3 βήματα μπροστά.",
        "Φτιάξε μια μπάλα από τσαλακωμένο χαρτί και δοκίμασε 3 'βολές' στον κάδο απορριμμάτων.",
        "Τρέξε επιτόπου όσο πιο γρήγορα μπορείς για 15 δευτερόλεπτα!",
        "Γίνε εφευρέτης παιχνιδιών: Σκέψου ένα εντελώς νέο άθλημα που να παίζεται με μια μπάλα και ένα σκοινί.",
        "Ζωγράφισε τους 5 ολυμπιακούς κύκλους. Ξέρεις ποια χρώματα έχουν;",
        "Σκέψου ένα δυναμικό σύνθημα για την αγαπημένη σου ομάδα (ή για το τμήμα σου στο σχολείο!).",
        "Κάνε 5 βαθιά καθίσματα (squats) κρατώντας την πλάτη σου ίσια. Πάμε!"
      ],
      default: [
        "Μοιράσου τη γνώση! Πες το σημερινό ιστορικό γεγονός σε έναν φίλο ή μέλος της οικογένειάς σου.",
        "Σχεδίασε στο τετράδιό σου ένα πολύ μικρό εικονίδιο που να ταιριάζει με το γεγονός της ημέρας.",
        "Κάνε ένα τεράστιο χαμόγελο στον επόμενο άνθρωπο που θα δεις σήμερα!",
        "Διάβασε μεγαλόφωνα μία σελίδα από το αγαπημένο σου εξωσχολικό βιβλίο.",
        "Σκέψου το πιο πετυχημένο ανέκδοτο που ξέρεις και πήγαινε να το πεις σε κάποιον.",
        "Κλείσε τα μάτια σου και μέτρα αργά μέχρι το 30 για να χαλαρώσεις το μυαλό σου.",
        "Γράψε σε ένα χαρτί 3 μικρά πράγματα για τα οποία νιώθεις χαρούμενος/η σήμερα.",
        "Φτιάξε ένα νοερό παζλ: Διάλεξε ένα αντικείμενο στο δωμάτιο και προσπάθησε να το ζωγραφίσεις από μνήμης.",
        "Κάνε ένα κομπλιμέντο, πες έναν καλό λόγο σε κάποιον συμμαθητή ή φίλο σου σήμερα.",
        "Γράψε τη σημερινή ημερομηνία στο τετράδιό σου με τα πιο περίτεχνα γράμματα που μπορείς.",
        "Αν η σημερινή μέρα είχε ένα δικό της χρώμα, ποιο θα ήταν αυτό;",
        "Κάνε 3 'high five' (έστω και στον αέρα) για να γιορτάσεις τη σημερινή μέρα!"
      ]
    },
    
    // Αντί για δεκάδες "if-else", χρησιμοποιούμε ένα κομψό αντικείμενο-λεξικό
    keywordsMap: {
      space: ["σελήνη", "διάστημ", "πλανήτ", "apollo", "τηλεσκόπιο", "δορυφόρ", "άρη", "αστρονόμ", "ήλιο"],
      tech: ["εφευρίσκει", "υπολογιστ", "apple", "ρεύμα", "λάμπα", "αυτοκίνητ", "windows", "εφεύρεση", "μηχαν", "τηλέφων"],
      arts: ["βιβλ", "ταινία", "ζωγράφο", "μίκυ", "χάρι", "πικάσο", "σκίτσο", "συγγραφέ", "μουσικ", "σινεμά"],
      exploration: ["εξερευνητ", "κολόμβος", "μαγγελάνος", "ωκεανό", "νησ", "καράβ", "ήπειρ", "διώρυγα", "ταξί"],
      history: ["επανάστασ", "απελευθερώνεται", "μάχη", "βασιλι", "ιστορ", "πόλεμ", "αυτοκρατορ", "σύνταγμα"],
      science: ["φυσικ", "χημικ", "νεύτων", "αϊνστάιν", "βαρύτητ", "θεωρία", "μάθημα", "στοιχείο"],
      biology: ["γιατρ", "εμβόλι", "πενικιλίνη", "φάρμακ", "ιός", "δεινόσαυρ", "φυτ", "πάστερ"],
      sports: ["αγών", "ολυμπιακ", "ποδόσφαιρ", "μπάσκετ", "αθλητ", "γυμναστικ"]
    }
  });

  // ==========================================
  // 2. UTILS & HELPERS
  // ==========================================
  const Utils = {
    // Κομψή αναζήτηση της κατάλληλης αποστολής
    generateMission: (factText) => {
      const text = factText.toLowerCase();
      let category = 'default';

      // Σαρώνει τις κατηγορίες αντί να ελέγχει τεράστια if
      for (const [key, keywords] of Object.entries(DATA.keywordsMap)) {
        if (keywords.some(kw => text.includes(kw))) {
          category = key;
          break;
        }
      }
      
      const missionsList = DATA.missions[category];
      return missionsList[Math.floor(Math.random() * missionsList.length)];
    },

    getDateKey: () => {
      const today = new Date();
      return `${today.getMonth()}-${today.getDate()}`;
    }
  };

  // ==========================================
  // 3. WIDGET MANAGER
  // ==========================================
  const WidgetManager = {
    init: () => {
      const factElement = document.getElementById("history-fact-mobile");
      if (!factElement) return;

      const dateKey = Utils.getDateKey();
      const currentFact = DATA.historyFactsMobile[dateKey] || CONFIG.defaultFact;

      // Κρύβουμε το στοιχείο αρχικά για το fade in (εκτός αν υπάρχει ήδη CSS που το κάνει)
      factElement.style.opacity = '0';
      factElement.innerHTML = currentFact;

      const missionElement = document.getElementById("mission-text-mobile");
      if (missionElement) {
        const storageKey = `${CONFIG.storagePrefix}${dateKey}`;
        let savedMission = localStorage.getItem(storageKey);

        if (!savedMission) {
          savedMission = Utils.generateMission(currentFact);
          localStorage.setItem(storageKey, savedMission);
        }
        missionElement.innerHTML = savedMission;
      }

      // Ομαλό Fade-in χωρίς lag
      setTimeout(() => {
        window.requestAnimationFrame(() => {
          factElement.style.transition = "opacity 0.5s ease";
          factElement.style.opacity = '1';
        });
      }, CONFIG.animDelay);
    },

    // Λειτουργία Toggling για το κινητό (προσβάσιμη & με stopPropagation)
    toggleContainer: (event) => {
      if (event) event.stopPropagation();
      const container = document.getElementById("mission-container-mobile");
      if (container) container.classList.toggle("open");
    },

    // Διαχείριση κλεισίματος όταν γίνεται click έξω
    setupOutsideClick: () => {
      document.addEventListener("click", (event) => {
        const wrapper = document.getElementById("history-wrapper-container-mobile");
        const container = document.getElementById("mission-container-mobile");
        
        if (wrapper && !wrapper.contains(event.target)) {
          if (container && container.classList.contains("open")) {
            container.classList.remove("open");
          }
        }
      }, { passive: true });
    }
  };

  // ==========================================
  // 4. ΕΚΚΙΝΗΣΗ ΛΕΙΤΟΥΡΓΙΩΝ
  // ==========================================
  // Εξάγουμε το toggle function παγκοσμίως (window) σε περίπτωση που το καλείς inline στο HTML με onclick="toggleMissionMobile(event)"
  window.toggleMissionMobile = WidgetManager.toggleContainer;

  document.addEventListener("DOMContentLoaded", () => {
    // Χρησιμοποιούμε μια μικρή καθυστέρηση (όπως είχες) για να μην μπλοκάρουμε το κύριο νήμα (main thread) στο κινητό
    setTimeout(() => {
      WidgetManager.init();
      WidgetManager.setupOutsideClick();
    }, CONFIG.initDelay);
  });

})();

(() => {
  "use strict";

  // ==========================================
  // 1. CONFIGURATION
  // ==========================================
  const CONFIG = Object.freeze({
    factElementId: "fact-text-mob",
    flipInnerId: "flip-inner-mob",
    flippedClass: "is-flipped",
    // ΠΡΟΣΟΧΗ: Βάλε εδώ τον ΜΙΣΟ χρόνο από το CSS transition σου (σε milliseconds). 
    // Αν το CSS σου λέει "transition: transform 0.6s;", βάλε εδώ 300. 
    // Έτσι η αλλαγή θα γίνει ακριβώς στις 90 μοίρες!
    flipMidpointMs: 350 
  });

  const DATA = Object.freeze({
    // [ΒΑΛΕ ΕΔΩ ΤΙΣ 150 ΠΛΗΡΟΦΟΡΙΕΣ ΣΟΥ]
    kidsFactsMob: [
      "...οι μέλισσες μπορούν να «δείξουν» στις άλλες πού είναι τα λουλούδια με έναν χορό;",
      "...το χταπόδι έχει τρεις καρδιές;",
      "...τα δελφίνια επικοινωνούν με ήχους και «σφυρίγματα»;",
      "...οι αράχνες δεν είναι έντομα — είναι αραχνοειδή;",
      "...οι πεταλούδες έχουν αισθητήρες γεύσης στα πόδια τους;",
      "...οι σκύλοι ιδρώνουν κυρίως από τις πατούσες τους;",
      "...οι γάτες δεν νιώθουν τη γλυκιά γεύση όπως οι άνθρωποι;",
      "...οι ελέφαντες μπορούν να επικοινωνούν και με πολύ χαμηλούς ήχους;",
      "...οι καμηλοπαρδάλεις έχουν τον ίδιο αριθμό οστών στον λαιμό με εμάς (7);",
      "...οι πιγκουίνοι είναι πουλιά, αλλά δεν μπορούν να πετάξουν;",
      "...οι νυχτερίδες είναι τα μοναδικά θηλαστικά που πετούν πραγματικά;",
      "...τα κολιμπρί μπορούν να πετάξουν και προς τα πίσω;",
      "...οι κουκουβάγιες μπορούν να γυρίζουν πολύ το κεφάλι τους για να κοιτάζουν γύρω;",
      "...οι βάτραχοι απορροφούν νερό και από το δέρμα τους;",
      "...οι αστερίες δεν έχουν εγκέφαλο όπως εμείς;",
      "...οι μέδουσες αποτελούνται κυρίως από νερό;",
      "...οι ιππόκαμποι έχουν κάτι ξεχωριστό: ο μπαμπάς κουβαλά τα αυγά;",
      "...οι κοράλλιοι ύφαλοι χτίζονται από πάρα πολλούς μικρούς οργανισμούς μαζί;",
      "...οι κάστορες φτιάχνουν φράγματα με κλαδιά και λάσπη;",
      "...οι φάλαινες είναι θηλαστικά και αναπνέουν αέρα;",
      "...οι χελώνες έχουν κέλυφος που είναι μέρος του σκελετού τους;",
      "...οι σκαντζόχοιροι προστατεύονται με τα αγκάθια τους;",
      "...οι γορίλες ζουν σε ομάδες και φροντίζουν τα μικρά τους;",
      "...οι λύκοι «μιλούν» μεταξύ τους με ουρλιαχτά και κινήσεις του σώματος;",
      "...οι πάπιες έχουν αδιάβροχα φτερά επειδή τα λαδώνουν με ειδικό έλαιο;",
      "...τα μυρμήγκια δουλεύουν μαζί και φτιάχνουν πολύ οργανωμένες φωλιές;",
      "...οι μέλισσες είναι σημαντικές γιατί βοηθούν στην επικονίαση των φυτών;",
      "...οι καρχαρίες έχουν σκελετό από χόνδρο, όχι από κόκαλο;",
      "...τα σαλιγκάρια έχουν «κεραίες» για να αισθάνονται το περιβάλλον;",
      "...οι χήνες πετούν συχνά σε σχήμα V για να εξοικονομούν ενέργεια;",

      // ===== ΔΙΑΣΤΗΜΑ =====
      "...ο Ήλιος είναι αστέρι και δίνει φως και θερμότητα στη Γη;",
      "...το φως από τον Ήλιο χρειάζεται περίπου 8 λεπτά για να φτάσει στη Γη;",
      "...η Σελήνη είναι ο φυσικός δορυφόρος της Γης;",
      "...στη Σελήνη δεν υπάρχει αέρας όπως στη Γη;",
      "...στο διάστημα ο ήχος δεν ταξιδεύει όπως στη Γη, επειδή δεν υπάρχει αέρας;",
      "...ο Δίας είναι ο μεγαλύτερος πλανήτης του Ηλιακού Συστήματος;",
      "...ο Κρόνος είναι γνωστός για τους εντυπωσιακούς δακτυλίους του;",
      "...ο Άρης λέγεται «κόκκινος πλανήτης» λόγω της σκόνης του;",
      "...η Αφροδίτη περιστρέφεται προς την αντίθετη κατεύθυνση από πολλές άλλες πλανήτες;",
      "...η Γη κάνει μία περιστροφή γύρω από τον άξονά της σε περίπου 24 ώρες;",
      "...η Γη κάνει μία περιφορά γύρω από τον Ήλιο σε περίπου 365 ημέρες;",
      "...οι εποχές αλλάζουν επειδή ο άξονας της Γης γέρνει;",
      "...οι αστροναύτες σε τροχιά φαίνονται «χωρίς βάρος» επειδή πέφτουν συνεχώς γύρω από τη Γη;",
      "...οι μετεωρίτες είναι κομμάτια από πέτρα ή μέταλλο που φτάνουν στο έδαφος;",
      "...τα «πεφταστέρια» είναι συνήθως μικρά κομμάτια που καίγονται στην ατμόσφαιρα;",
      "...ο Γαλαξίας μας λέγεται «Γαλαξίας» ή «Milky Way»;",
      "...σε μια καθαρή νύχτα μπορείς να δεις χιλιάδες αστέρια με γυμνό μάτι;",
      "...τα τηλεσκόπια βοηθούν να βλέπουμε πολύ μακρινά αντικείμενα στο διάστημα;",
      "...οι κομήτες έχουν συχνά «ουρά» όταν πλησιάζουν τον Ήλιο;",
      "...η ατμόσφαιρα της Γης μας προστατεύει από πολλά επικίνδυνα σωματίδια;",
      "...το σέλας (βόρειο σέλας) δημιουργείται από σωματίδια που συναντούν την ατμόσφαιρα;",
      "...ο Ερμής είναι ο πιο κοντινός πλανήτης στον Ήλιο;",
      "...ο Ποσειδώνας είναι πολύ μακριά από τον Ήλιο και είναι πολύ κρύος;",
      "...οι πλανήτες δεν εκπέμπουν φως μόνοι τους — αντανακλούν το φως του Ήλιου;",
      "...οι δορυφόροι γύρω από τη Γη χρησιμοποιούνται για επικοινωνίες και πρόγνωση καιρού;",
      "...οι εκλείψεις συμβαίνουν όταν ευθυγραμμίζονται Ήλιος, Γη και Σελήνη;",
      "...η Γη είναι λίγο «πλακουτσωτή» στους πόλους της και όχι τέλεια στρογγυλή;",
      "...οι δακτύλιοι του Κρόνου αποτελούνται από πάγο και πετρώματα;",
      "...οι αστερισμοί είναι «σχήματα» που φτιάχνουμε στον ουρανό ενώνοντας αστέρια;",
      "...τα ρομπότ έχουν βοηθήσει στην εξερεύνηση πλανητών, όπως στον Άρη;",

      // ===== ΑΝΘΡΩΠΙΝΟ ΣΩΜΑ =====
      "...η καρδιά μας χτυπά περίπου 100.000 φορές την ημέρα;",
      "...το αίμα μεταφέρει οξυγόνο σε όλο μας το σώμα;",
      "...ο εγκέφαλος μας βοηθά να σκεφτόμαστε, να θυμόμαστε και να μαθαίνουμε;",
      "...τα οστά μας προστατεύουν τα όργανα και μας στηρίζουν;",
      "...τα παιδιά έχουν περισσότερα οστά από τους ενήλικες, γιατί κάποια ενώνονται μεγαλώνοντας;",
      "...οι μύες μας βοηθούν να κινούμαστε;",
      "...το δέρμα είναι το μεγαλύτερο όργανο του σώματος;",
      "...τα δόντια έχουν σμάλτο, ένα από τα πιο σκληρά υλικά στο σώμα μας;",
      "...οι πνεύμονες παίρνουν οξυγόνο από τον αέρα όταν αναπνέουμε;",
      "...η γλώσσα μας βοηθά στη γεύση και στην ομιλία;",
      "...τα μάτια μας μένουν σχεδόν στο ίδιο μέγεθος από τότε που γεννιόμαστε;",
      "...τα αυτιά βοηθούν και στην ισορροπία, όχι μόνο στην ακοή;",
      "...η μύτη μας βοηθά να μυρίζουμε και να φιλτράρουμε τον αέρα;",
      "...το στομάχι βοηθά στη διάσπαση της τροφής;",
      "...το λεπτό έντερο απορροφά πολλά θρεπτικά συστατικά από την τροφή;",
      "...το ήπαρ (συκώτι) κάνει πολλές δουλειές, όπως να επεξεργάζεται ουσίες στο αίμα;",
      "...τα νεφρά φιλτράρουν το αίμα και βοηθούν να αποβάλλουμε άχρηστες ουσίες;",
      "...ο ιδρώτας βοηθά το σώμα να δροσίζεται;",
      "...τα μαλλιά και τα νύχια αποτελούνται κυρίως από κερατίνη;",
      "...το ανοιγοκλείσιμο των ματιών προστατεύει και ενυδατώνει τα μάτια;",
      "...οι βλεφαρίδες βοηθούν να μην μπαίνει σκόνη στα μάτια;",
      "...οι άνθρωποι έχουν πέντε βασικές αισθήσεις: όραση, ακοή, όσφρηση, γεύση, αφή;",
      "...η σπονδυλική στήλη προστατεύει τον νωτιαίο μυελό;",
      "...το φτέρνισμα είναι ένας τρόπος να διώχνει το σώμα ερεθισμούς από τη μύτη;",
      "...ο λαιμός περιέχει και τον δρόμο για τον αέρα (τραχεία) και για την τροφή (οισοφάγος);",
      "...ο ύπνος βοηθά το σώμα και τον εγκέφαλο να ξεκουραστούν;",
      "...το νερό είναι πολύ σημαντικό για το σώμα μας;",
      "...οι παλμοί αυξάνονται όταν τρέχουμε ή αθλούμαστε;",
      "...τα δάχτυλά μας έχουν αποτυπώματα που είναι μοναδικά;",
      "...ο εγκέφαλος χρησιμοποιεί ενέργεια ακόμα κι όταν ξεκουραζόμαστε;",

      // ===== ΦΥΤΑ & ΦΥΣΗ =====
      "...τα φυτά φτιάχνουν την τροφή τους με τη φωτοσύνθεση χρησιμοποιώντας φως;",
      "...τα φύλλα βοηθούν το φυτό να «πιάνει» φως από τον Ήλιο;",
      "...οι ρίζες κρατούν το φυτό στο έδαφος και απορροφούν νερό;",
      "...οι σπόροι μπορούν να γίνουν νέα φυτά όταν έχουν νερό και ζέστη;",
      "...τα λουλούδια βοηθούν πολλά φυτά να φτιάξουν σπόρους;",
      "...οι μέλισσες και άλλα έντομα βοηθούν στην επικονίαση;",
      "...τα δέντρα μπορούν να δώσουν σκιά και δροσιά το καλοκαίρι;",
      "...τα δέντρα αποθηκεύουν άνθρακα στον κορμό και στα κλαδιά τους;",
      "...το νερό της βροχής μπαίνει στο έδαφος και βοηθά τα φυτά να μεγαλώνουν;",
      "...το έδαφος έχει μικρούς οργανισμούς που βοηθούν τα φυτά;",
      "...τα μανιτάρια δεν είναι φυτά — ανήκουν σε ξεχωριστή ομάδα οργανισμών;",
      "...το μπαμπού είναι ένα από τα φυτά που μεγαλώνουν πολύ γρήγορα;",
      "...τα ηλιοτρόπια μπορούν να στρέφονται προς το φως όταν είναι νεαρά;",
      "...τα πεύκα έχουν συχνά βελόνες αντί για πλατιά φύλλα;",
      "...οι βελανιδιές κάνουν βελανίδια, που είναι τροφή για πολλά ζώα;",
      "...τα κωνοφόρα δέντρα έχουν συνήθως κουκουνάρια;",
      "...ο κύκλος του νερού περιλαμβάνει εξάτμιση, σύννεφα και βροχή;",
      "...ένα σύννεφο αποτελείται από μικροσκοπικές σταγόνες νερού ή κρυστάλλους πάγου;",
      "...η ομίχλη είναι σαν σύννεφο που βρίσκεται πολύ χαμηλά, κοντά στο έδαφος;",
      "...το ουράνιο τόξο εμφανίζεται όταν το φως περνά μέσα από σταγόνες νερού;",
      "...η ανακύκλωση βοηθά να μειώνουμε τα σκουπίδια;",
      "...το χαρτί μπορεί να φτιαχτεί από ξύλο, γι’ αυτό είναι καλό να το ανακυκλώνουμε;",
      "...το γυαλί μπορεί να ανακυκλώνεται πολλές φορές;",
      "...η θάλασσα έχει αλάτι και πολλά είδη ζώων και φυτών;",
      "...τα φύκια στη θάλασσα είναι σημαντικά για πολλά θαλάσσια ζώα;",
      "...οι ερημικές περιοχές έχουν λίγη βροχή και ειδικά φυτά που αντέχουν στην ξηρασία;",
      "...τα ποτάμια μεταφέρουν νερό από τα βουνά προς τη θάλασσα;",
      "...οι καταρράκτες δημιουργούνται όταν το νερό πέφτει από ύψος;",
      "...η Γη έχει περισσότερη επιφάνεια με νερό παρά με στεριά;",
      "...τα απολιθώματα είναι ίχνη ή υπολείμματα πολύ παλιών οργανισμών που έχουν «κρατηθεί» σε πέτρα;",

      // ===== ΙΣΤΟΡΙΑ & ΤΕΧΝΟΛΟΓΙΑ =====
      "...η Πυραμίδα της Γκίζας χτίστηκε στην Αρχαία Αίγυπτο πριν από χιλιάδες χρόνια;",
      "...οι αρχαίοι Έλληνες έκαναν τους πρώτους Ολυμπιακούς Αγώνες στην Ολυμπία;",
      "...οι αρχαίοι Ολυμπιακοί Αγώνες περιλάμβαναν αθλήματα όπως το τρέξιμο;",
      "...οι χάρτες βοηθούν να βρίσκουμε μέρη στη Γη;",
      "...οι πυξίδες δείχνουν περίπου προς τον Βορρά χάρη στο μαγνητικό πεδίο της Γης;",
      "...η γραφή βοηθά τους ανθρώπους να κρατούν πληροφορίες και ιστορίες;",
      "...το αλφάβητο έχει γράμματα που αντιστοιχούν σε ήχους;",
      "...τα μουσεία φυλάσσουν αντικείμενα που μας μαθαίνουν για το παρελθόν;",
      "...οι βιβλιοθήκες συγκεντρώνουν βιβλία για να τα διαβάζουν πολλοί άνθρωποι;",
      "...ο τροχός ήταν μια από τις σημαντικές εφευρέσεις για τις μεταφορές;",
      "...τα πλοία βοηθούν στη μεταφορά ανθρώπων και πραγμάτων στη θάλασσα;",
      "...τα τρένα κινούνται πάνω σε ράγες και μπορούν να μεταφέρουν πολλούς επιβάτες;",
      "...τα αεροπλάνα πετούν χρησιμοποιώντας φτερά που δημιουργούν άνωση;",
      "...τα ποδήλατα κινούνται όταν κάνουμε πετάλι;",
      "...το πρώτο ποντίκι υπολογιστή είχε κατασκευαστεί από ξύλο;",
      "...οι υπολογιστές ακολουθούν οδηγίες που λέγονται «προγράμματα»;",
      "...το Διαδίκτυο βοηθά να στέλνουμε πληροφορίες πολύ γρήγορα;",
      "...οι δορυφόροι βοηθούν σε GPS και επικοινωνίες;",
      "...τα ρομπότ είναι μηχανές που μπορούν να κάνουν συγκεκριμένες δουλειές;",
      "...οι σεισμογράφοι είναι όργανα που μετρούν τους σεισμούς;",
      "...τα θερμόμετρα μετρούν τη θερμοκρασία;",
      "...τα μικροσκόπια βοηθούν να βλέπουμε πολύ μικρά πράγματα;",
      "...το barcode (γραμμωτός κώδικας) βοηθά τα ταμεία να αναγνωρίζουν προϊόντα;",
      "...το ποπ κορν ήταν γνωστό σε λαούς της Αμερικής εδώ και χιλιάδες χρόνια;",
      "...οι Βίκινγκς δεν φορούσαν κράνη με κέρατα — αυτό είναι μύθος από ζωγραφιές και ταινίες;",
      "...το Σινικό Τείχος της Κίνας είναι ένα από τα μεγαλύτερα ανθρώπινα έργα;",
      "...η Βενετία είναι χτισμένη πάνω σε πασσάλους μέσα στο νερό;",
      "...ο Πύργος του Άιφελ μπορεί να αλλάζει λίγο ύψος με τη ζέστη (διαστολή μετάλλου);",
      "...η ανακύκλωση ενός γυάλινου μπουκαλιού εξοικονομεί ενέργεια σε σχέση με το να φτιάξεις νέο;",
      "...οι φακοί (όπως στα γυαλιά) μπορούν να βοηθήσουν να βλέπουμε καλύτερα;",
"...ο άνθρωπος αναπνέει περίπου 20.000 φορές την ημέρα;",
"...οι καμηλοπαρδάλεις κοιμούνται συνήθως λιγότερο από 2 ώρες την ημέρα;",
"...η Γη δεν είναι τέλεια στρογγυλή αλλά λίγο πλακουτσωτή στους πόλους;",
"...οι κροκόδειλοι δεν μπορούν να βγάλουν τη γλώσσα τους έξω;",
"...τα σαλιγκάρια μπορούν να κοιμηθούν για πολύ μεγάλο διάστημα;",
"...οι πολικές αρκούδες έχουν μαύρο δέρμα κάτω από το άσπρο τρίχωμα;",
"...η σοκολάτα προέρχεται από τους καρπούς του κακαόδεντρου;",
"...οι αράχνες μπορούν να φτιάξουν μετάξι πιο δυνατό από ατσάλι στο ίδιο πάχος;",
"...ο ανθρώπινος σκελετός έχει 206 οστά όταν μεγαλώσουμε;",
"...οι φλόγες δεν έχουν πάντα το ίδιο χρώμα;",
"...οι καμηλοπαρδάλεις έχουν μπλε γλώσσα;",
"...ο Βόρειος Πόλος και ο Νότιος Πόλος δεν είναι το ίδιο μέρος;",
"...οι γλάροι μπορούν να πίνουν και θαλασσινό νερό;",
"...τα καρότα δεν ήταν πάντα πορτοκαλί;",
"...οι φράουλες έχουν τα σποράκια τους εξωτερικά;",
"...η καρδιά της γαλάζιας φάλαινας είναι τόσο μεγάλη όσο ένα μικρό αυτοκίνητο;",
"...οι παπαγάλοι μπορούν να μιμούνται ανθρώπινες φωνές;",
"...η σκιά αλλάζει μέγεθος μέσα στη μέρα;",
"...οι μέρες το καλοκαίρι είναι μεγαλύτερες από τον χειμώνα;",
"...οι πάγοι μπορούν να επιπλέουν επειδή είναι ελαφρύτεροι από το νερό;",
"...οι πλανήτες κινούνται συνεχώς γύρω από τον Ήλιο;",
"...οι μέλισσες βλέπουν και υπεριώδες φως;",
"...τα φλαμίνγκο είναι ροζ λόγω της τροφής τους;",
"...ο κεραυνός είναι πιο ζεστός από την επιφάνεια του Ήλιου για μια στιγμή;",
"...οι καμηλοπαρδάλεις έχουν μοναδικό σχέδιο στο τρίχωμά τους;",
"...οι πιγκουίνοι κάνουν πρόταση με ένα πετραδάκι;",
"...οι τίγρεις έχουν ρίγες και στο δέρμα τους;",
"...τα δελφίνια κοιμούνται με μισό εγκέφαλο κάθε φορά;",
"...η Γη έχει φυσικό μαγνητικό πεδίο;",
"...οι άνθρωποι έχουν περίπου 5 λίτρα αίμα στο σώμα τους;",
"...οι πάγοι της Ανταρκτικής είναι οι μεγαλύτεροι στον κόσμο;",
"...οι γάτες χρησιμοποιούν τα μουστάκια τους για να μετρούν χώρους;",
"...οι καρχαρίες αλλάζουν συνεχώς δόντια;",
"...οι μπανάνες είναι στην πραγματικότητα μούρα;",
"...οι κεραυνοί μπορούν να χτυπήσουν και την ίδια περιοχή δύο φορές;",
"...τα άλογα μπορούν να κοιμούνται και όρθια;",
"...οι πάγοι στους πόλους αντανακλούν το φως του Ήλιου;",
"...οι πεταλούδες ξεκινούν τη ζωή τους ως κάμπιες;",
"...οι αράχνες έχουν συνήθως οκτώ μάτια;",
"...η Σελήνη απομακρύνεται λίγο κάθε χρόνο από τη Γη;",
"...οι καμηλοπαρδάλεις μπορούν να τρέξουν πολύ γρήγορα;",
"...τα μήλα επιπλέουν στο νερό;",
"...οι φώκιες μπορούν να κρατήσουν την αναπνοή τους για πολλή ώρα;",
"...οι άνθρωποι έχουν διαφορετικές ομάδες αίματος;",
"...οι φάλαινες μπορούν να τραγουδούν;",
"...οι γάτες μπορούν να περιστρέφουν τα αυτιά τους;",
"...οι μέλισσες έχουν πέντε μάτια;",
"...ο ουρανός δεν είναι πάντα μπλε;",
"...τα κοχύλια ήταν κάποτε σπίτια ζώων;",
"...οι καμηλοπαρδάλεις γεννούν όρθιες;",
"...οι ελέφαντες δεν μπορούν να πηδήξουν;",
"...οι πάπιες έχουν βλέφαρα που κλείνουν από το πλάι;",
"...οι πιγκουίνοι γλιστρούν στην κοιλιά τους στον πάγο;",
"...οι κεραυνοί μπορεί να φανούν πριν ακουστεί ο ήχος τους;",
"...οι σκίουροι ξεχνούν πού κρύβουν μερικούς καρπούς τους;",
"...οι άνθρωποι χάνουν και βγάζουν νέα δόντια μία φορά;",
"...οι γάτες γουργουρίζουν και όταν είναι χαρούμενες;",
"...οι αράχνες δεν κολλάνε στον δικό τους ιστό;",
"...η Αυστραλία είναι και χώρα και ήπειρος;",
"...οι νυχτερίδες κρέμονται ανάποδα για να ξεκουράζονται;",
"...οι κάμπιες έχουν περισσότερα πόδια από τις πεταλούδες;",
"...οι καρχαρίες μπορούν να μυρίσουν αίμα από μακριά;",
"...τα σύννεφα μπορεί να ζυγίζουν πάρα πολύ;",
"...οι ελέφαντες χρησιμοποιούν την προβοσκίδα σαν εργαλείο;",
"...οι πάγοι λιώνουν όταν ανεβαίνει η θερμοκρασία;",
"...οι άνθρωποι έχουν περίπου 600 μύες;",
"...οι γάτες καθαρίζονται γλείφοντας το τρίχωμά τους;",
"...οι παπαγάλοι μπορούν να ζήσουν πολλά χρόνια;",
"...οι πιγκουίνοι ζουν μόνο στο νότιο ημισφαίριο;",
"...οι κεραυνοί δημιουργούν βροντή;",
"...οι καμήλες έχουν δύο σειρές βλεφαρίδες;",
"...οι άνθρωποι έχουν μοναδικό αποτύπωμα γλώσσας;",
"...οι αστερίες μπορούν να αναγεννήσουν χαμένα μέρη;",
"...οι σκύλοι έχουν πολύ πιο δυνατή όσφρηση από τους ανθρώπους;",
"...οι πλανήτες έχουν διαφορετικά μεγέθη;",
"...οι μέλισσες παράγουν μέλι από νέκταρ;",
"...οι πάπιες μπορούν να κοιμούνται με ένα μάτι ανοιχτό;",
"...οι φάλαινες είναι από τα μεγαλύτερα ζώα που έζησαν ποτέ;",
"...οι γάτες προσγειώνονται συχνά στα πόδια τους;",
"...οι καμηλοπαρδάλεις έχουν δυνατή καρδιά για να στέλνει αίμα ψηλά;",
"...οι κεραυνοί μπορούν να φωτίσουν ολόκληρο τον ουρανό;",
"...οι άνθρωποι αλλάζουν ύψος ελαφρώς μέσα στη μέρα;",
"...οι πολικές αρκούδες είναι εξαιρετικοί κολυμβητές;",
"...οι αράχνες τυλίγουν την τροφή τους με μετάξι;",
"...οι φλόγες χρειάζονται οξυγόνο για να καίνε;",
"...οι γάτες ακούν ήχους που οι άνθρωποι δεν μπορούν;",
"...οι πιγκουίνοι προστατεύουν τα αυγά τους με το σώμα τους;",
"...οι άνθρωποι έχουν περίπου 10.000 γευστικούς κάλυκες;",
"...οι καρχαρίες ζουν σε όλες σχεδόν τις θάλασσες;",
"...οι σκύλοι μπορούν να μάθουν πολλές εντολές;",
"...η βροντή είναι ο ήχος του κεραυνού;",
"...οι καμηλοπαρδάλεις πίνουν νερό ανοίγοντας πολύ τα πόδια τους;"
    
    ]
  });

  // ==========================================
  // 2. STATE 
  // ==========================================
  const STATE = {
    shuffledFacts: [],
    currentIndex: 0
  };

  // ==========================================
  // 3. UTILS (Εργαλεία)
  // ==========================================
  const Utils = {
    // Ο περίφημος αλγόριθμος Fisher-Yates
    // Ανακατεύει τον πίνακα μία φορά, εξαιρετικά γρήγορα και με τέλεια τυχαιότητα
    shuffleArray: (array) => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
  };

  // ==========================================
  // 4. MANAGER (Λογική & DOM)
  // ==========================================
  const FlipManager = {
    el: {},

    init: () => {
      FlipManager.el.fact = document.getElementById(CONFIG.factElementId);
      FlipManager.el.flipInner = document.getElementById(CONFIG.flipInnerId);

      // Ασφάλεια: Αν δεν βρει τα στοιχεία, σταματάει χωρίς error
      if (!FlipManager.el.fact || !FlipManager.el.flipInner) return;

      // Αν υπάρχουν δεδομένα, ανακατεύουμε την "τράπουλα" κατά το φόρτωμα
      if (DATA.kidsFactsMob.length > 0) {
        STATE.shuffledFacts = Utils.shuffleArray(DATA.kidsFactsMob);
        STATE.currentIndex = 0;
        FlipManager.updateDOM(); // Φορτώνει το πρώτο χωρίς delay
      }

      FlipManager.setupEvents();
    },

    // Τραβάει το επόμενο "χαρτί" χωρίς να κόβει/ράβει τον πίνακα (μηδενικό κόστος CPU)
    getNextFact: () => {
      if (STATE.shuffledFacts.length === 0) return "";
      
      const fact = STATE.shuffledFacts[STATE.currentIndex];
      STATE.currentIndex++;

      // Αν φτάσαμε στο τελευταίο fact, ξανα-ανακατεύουμε την τράπουλα και πάμε από την αρχή
      if (STATE.currentIndex >= STATE.shuffledFacts.length) {
        STATE.shuffledFacts = Utils.shuffleArray(DATA.kidsFactsMob);
        STATE.currentIndex = 0;
      }

      return fact;
    },

    updateDOM: () => {
      const nextFact = FlipManager.getNextFact();
      if (nextFact) {
        FlipManager.el.fact.innerHTML = nextFact;
      }
    },

    toggle: () => {
      const { flipInner } = FlipManager.el;
      const isCurrentlyFlipped = flipInner.classList.contains(CONFIG.flippedClass);
      const willBeFlipped = !isCurrentlyFlipped;

      // 1. Γυρίζουμε την κάρτα άμεσα και ομαλά
      window.requestAnimationFrame(() => {
        flipInner.classList.toggle(CONFIG.flippedClass, willBeFlipped);
        flipInner.setAttribute("aria-pressed", String(willBeFlipped));
      });

      // 2. Αλλάζουμε το κείμενο ΣΤΟ ΤΥΦΛΟ ΣΗΜΕΙΟ (90 μοίρες) 
      //    μόνο όταν η κάρτα ανοίγει για να δείξει τη νέα πληροφορία.
      if (willBeFlipped) {
        setTimeout(() => {
          FlipManager.updateDOM();
        }, CONFIG.flipMidpointMs);
      }
    },

    setupEvents: () => {
      const { flipInner } = FlipManager.el;

      // Mouse & Touch
      flipInner.addEventListener("click", FlipManager.toggle);

      // Keyboard (Προσβασιμότητα)
      flipInner.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          FlipManager.toggle();
        } else if (e.key === "Escape") {
          window.requestAnimationFrame(() => {
            flipInner.classList.remove(CONFIG.flippedClass);
            flipInner.setAttribute("aria-pressed", "false");
          });
        }
      });
    }
  };

  // ==========================================
  // 5. ΕΚΚΙΝΗΣΗ
  // ==========================================
  document.addEventListener("DOMContentLoaded", FlipManager.init);

})();


(() => {
  "use strict";

  // ==========================================
  // 1. CONFIGURATION (Ρυθμίσεις)
  // ==========================================
  const CONFIG = Object.freeze({
    maxBasePosts: 15,
    targetDate: new Date("2021-09-11T00:00:00Z"),
    autoSlideIntervalMs: 2000, 
    animLockMs: 500,
    
    // ΕΔΩ Η ΑΛΛΑΓΗ: Τώρα τραβάει απευθείας τα 15 "δημοφιλή" αστραπιαία!
    feedPopularUrl: "/feeds/posts/default/-/δημοφιλή?alt=json&max-results=15",
    
    // Η δεξαμενή για το άρθρο της εβδομάδας
    feedLabelsUrl: "/feeds/posts/default/-/Διαπαιδαγώγηση|Ψυχολογία|Σχολείο|Υγεία|Παιχνίδι|Γενικά?alt=json&max-results=50",
    
    safeImage: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgdYTGP-KF_2ZHc7ykgjO533JVSDXYPsg36Oi3XC0Z6UN-yEKAhpbsK5PME3r9Q_WeAXn-c20sWAmLR65slEVQSaYaDVKLuYQtaqbjuGyH71VxJxgZqWx5vG1JSCOFlqWswSphTn6Zup1d8Uz9Ie2Tq9CQeHmWBPusLJ7rc_bPJkiau4W47iSy6cSp60N4/s800/Gemini_Generated_Image_1itzx51itzx51itz.png",
    sliderContainerId: "slider-content-mobile",
    sliderWrapperId: "custom-post-slider-mobile"
  });

  const DATA = Object.freeze({
    // [ΒΑΛΕ ΕΔΩ ΤΗ ΔΕΞΑΜΕΝΗ ΜΕ ΤΙΣ ΣΤΑΤΙΚΕΣ ΣΕΛΙΔΕΣ ΣΟΥ]
    candidatePostsFor16: [
      { title: "Τα όρια δεν είναι φράχτες", link: "https://dimperist.blogspot.com/p/blog-page_8.html", image: "" },
    { title: "Αόρατος γονιός", link: "https://dimperist.blogspot.com/p/blog-page_1.html", image: "" },
    { title: "Πώς θα μεγαλώσουμε αυτόνομα και ανεξάρτητα παιδιά", link: "https://dimperist.blogspot.com/p/blog-page_13.html", image: "" },
    { title: "Τρόποι μείωσης της χρήσης οθονών από τα παιδιά", link: "https://dimperist.blogspot.com/p/blog-page.html", image: "" },
    { title: "10 τρόποι για να εκτιμά το παιδί τον εαυτό του", link: "https://dimperist.blogspot.com/p/10.html", image: "" },
    { title: "Τι κάνω όταν το παιδί μου θυμώνει;", link: "https://dimperist.blogspot.com/p/blog-page_86.html", image: "" },
    { title: "Παιδικές φοβίες: Αιτίες και Τρόποι Αντιμετώπισης", link: "https://dimperist.blogspot.com/p/blog-page_32.html", image: "" },
    { title: "Συναισθηματική ανάπτυξη & \"αρνητικά\" συναισθήματα", link: "https://dimperist.blogspot.com/p/blog-page_43.html", image: "" },
    { title: "Γράμμα παιδιού", link: "https://dimperist.blogspot.com/p/blog-page_71.html", image: "" },
    { title: "Το παιδί μου αντιμιλά, τι να κάνω;", link: "https://dimperist.blogspot.com/p/blog-page_98.html", image: "" },
    { title: "10 Συμβουλές για να αγαπήσουν τα «πρωτάκια» το σχολείο", link: "https://dimperist.blogspot.com/p/10_19.html", image: "" },
    { title: "Συμβουλές για καλύτερη επιστροφή στο σχολείο", link: "https://dimperist.blogspot.com/p/blog-page_19.html", image: "" },
    { title: "Οργάνωση μελέτης του παιδιού", link: "https://dimperist.blogspot.com/p/blog-page_20.html", image: "" },
    { title: "Πώς να κάνουν τα παιδιά να αγαπήσουν τα βιβλία", link: "https://dimperist.blogspot.com/p/blog-page_29.html", image: "" },
    { title: "Τι ΝΑ κάνετε και τι να ΜΗΝ κάνετε με το διάβασμα", link: "https://dimperist.blogspot.com/p/blog-page_64.html", image: "" },
    { title: "Bullying - Σχολικός Εκφοβισμός", link: "https://dimperist.blogspot.com/p/bullying.html", image: "" },
    { title: "Παιδική παχυσαρκία: Πρόληψη και σωστές διατροφικές συνήθειες", link: "https://dimperist.blogspot.com/p/blog-page_85.html", image: "" },
{ title: "Η άσκηση ως τρόπος ζωής", link: "https://dimperist.blogspot.com/2026/01/blog-post_14.html", image: "" },
{ title: "Ανακαλύψετε το σωστό άθλημα για το παιδί σας", link: "https://dimperist.blogspot.com/2026/02/blog-post_5.html", image: "" },
{ title: "Προστατεύομαι από τους σεισμούς", link: "https://dimperist.blogspot.com/p/blog-page_59.html", image: "" },
    { title: "Ενθαρρύνουμε τη δημιουργικότητα των παιδιών", link: "https://dimperist.blogspot.com/p/blog-page_41.html", image: "" },
    { title: "Η σημασία του παιχνιδιού στην ανάπτυξη", link: "https://dimperist.blogspot.com/p/blog-page_83.html", image: "" },
    { title: "Δραστηριότητες που αναπτύσσουν τις μαθησιακές δεξιότητες", link: "https://dimperist.blogspot.com/p/blog-page_56.html", image: "" }
    ]
  });

  // ==========================================
  // 2. STATE (Κατάσταση & Μνήμη)
  // ==========================================
  const STATE = {
    sliderPosts: [],
    currentIndex: 0,
    autoSlideTimer: null,
    isAnimating: false,
    touchStartX: 0
  };

  // ==========================================
  // 3. UTILITIES (Εργαλεία)
  // ==========================================
  const Utils = {
    extractMedia: (entry) => {
      let imageUrl = "";
      let isVideo = false;
      const content = entry.content ? entry.content.$t : "";

      try {
        const ytRegex = /(?:https?:)?\/\/(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
        const ytMatch = content.match(ytRegex);
        if (ytMatch && ytMatch[1]) {
          return { imageUrl: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`, isVideo: true };
        }

        const imgRegex = /<img[^>]+src="([^"]+)"/i;
        const imgMatch = content.match(imgRegex);
        if (imgMatch && imgMatch[1]) {
          imageUrl = imgMatch[1];
          if (imageUrl.includes("blogger.googleusercontent.com") || imageUrl.includes("bp.blogspot.com")) {
            imageUrl = imageUrl.replace(/\/s[0-9]+(-b|-c|-w)?\//, '/s1600/').replace(/=w[0-9]+-h[0-9]+(-c)?/, '=s1600');
          }
          return { imageUrl, isVideo: false };
        }

        if (entry.media$thumbnail && entry.media$thumbnail.url) {
          imageUrl = entry.media$thumbnail.url.replace(/\/s72-c\//, '/s1600/').replace(/=s72-c/, '=s1600');
          return { imageUrl, isVideo: false };
        }
      } catch (err) {}

      return { imageUrl: CONFIG.safeImage, isVideo: false };
    },

    getLink: (entry) => {
      const linkObj = entry.link.find(l => l.rel === "alternate");
      return linkObj ? linkObj.href : "#";
    }
  };

  // ==========================================
  // 4. API MANAGER (Σύγχρονες Κλήσεις Δεδομένων)
  // ==========================================
  const ApiManager = {
    fetchData: async () => {
      try {
        // Τραβάει ΤΑΥΤΟΧΡΟΝΑ και τις δύο λίστες άρθρων χωρίς <script> tags!
        const [popularRes, labelsRes] = await Promise.all([
          fetch(CONFIG.feedPopularUrl).then(r => r.json()),
          fetch(CONFIG.feedLabelsUrl).then(r => r.json())
        ]);

        ApiManager.processPopularPosts(popularRes);
        ApiManager.processWeeklyPick(labelsRes);
        
        SliderManager.buildDOM();
      } catch (error) {
        document.getElementById(CONFIG.sliderContainerId).innerHTML = 
          "<p style='text-align:center; padding:20px; color:#a90e0e;'>Σφάλμα φόρτωσης αναρτήσεων.</p>";
      }
    },

    processPopularPosts: (json) => {
      const entries = json.feed.entry || [];
      for (const entry of entries) {
        if (STATE.sliderPosts.length >= CONFIG.maxBasePosts) break;
        
        const publishedDate = new Date(entry.published.$t);
        if (publishedDate >= CONFIG.targetDate) {
          const media = Utils.extractMedia(entry);
          STATE.sliderPosts.push({
            title: entry.title.$t,
            link: Utils.getLink(entry),
            image: media.imageUrl,
            isVideo: media.isVideo
          });
        }
      }
    },

    processWeeklyPick: (json) => {
      let candidates = [...DATA.candidatePostsFor16];
      const entries = json.feed.entry || [];
      entries.forEach(entry => {
        const media = Utils.extractMedia(entry);
        candidates.push({
          title: entry.title.$t,
          link: Utils.getLink(entry),
          image: media.imageUrl,
          isVideo: media.isVideo
        });
      });

      const weekNum = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
      const weeklyPick = candidates[weekNum % candidates.length];

      const weeklyPostObj = {
        title: "⭐ " + weeklyPick.title,
        link: weeklyPick.link,
        image: weeklyPick.image || CONFIG.safeImage,
        isVideo: weeklyPick.isVideo || false
      };

      const targetIndex = Math.min(15, STATE.sliderPosts.length);
      STATE.sliderPosts.splice(targetIndex, 0, weeklyPostObj);

      if (STATE.sliderPosts.length > 16) {
        STATE.sliderPosts = STATE.sliderPosts.slice(0, 16);
      }
    }
  };

  // ==========================================
  // 5. SLIDER MANAGER (UI & DOM)
  // ==========================================
  const SliderManager = {
    buildDOM: () => {
      const container = document.getElementById(CONFIG.sliderContainerId);
      const wrapper = document.getElementById(CONFIG.sliderWrapperId);
      if (!container || !wrapper) return;

      const arrowPrev = wrapper.querySelector('.arrow-prev');
      const arrowNext = wrapper.querySelector('.arrow-next');

      if (STATE.sliderPosts.length === 0) {
        container.innerHTML = "<p style='text-align:center; padding:20px; color:#a90e0e;'>Δεν βρέθηκαν δημοφιλείς αναρτήσεις.</p>";
        return;
      }

      const fragment = document.createDocumentFragment();

      STATE.sliderPosts.forEach((post, index) => {
        const slide = document.createElement('div');
        slide.className = `slide-item ${index === 0 ? "active" : ""}`;
        
        const loadingAttr = index === 0 ? 'fetchpriority="high"' : 'loading="lazy"';
        const videoBadge = post.isVideo ? `<div class="video-badge">&#9654;</div>` : "";

        slide.innerHTML = `
          <a href="${post.link}" class="slide-link">
            ${videoBadge}
            <div class="slide-counter">${index + 1} / ${STATE.sliderPosts.length}</div>
            <img src="${post.image}" alt="${post.title}" ${loadingAttr}>
            <div class="slide-title-wrapper">
              <div class="slide-title">${post.title}</div>
            </div>
          </a>
        `;
        fragment.appendChild(slide);
      });

      container.innerHTML = "";
      container.appendChild(fragment);

      if (STATE.sliderPosts.length > 1) {
        if (arrowPrev) arrowPrev.classList.remove('hidden-arrow');
        if (arrowNext) arrowNext.classList.remove('hidden-arrow');
        
        SliderManager.startAutoSlide();
        SliderManager.setupEvents(wrapper, arrowPrev, arrowNext);
      }
    },

    showSlide: (index) => {
      const slides = document.querySelectorAll(`#${CONFIG.sliderWrapperId} .slide-item`);
      if (slides.length === 0) return;

      slides.forEach(slide => slide.classList.remove("active"));

      if (index >= STATE.sliderPosts.length) STATE.currentIndex = 0;
      else if (index < 0) STATE.currentIndex = STATE.sliderPosts.length - 1;
      else STATE.currentIndex = index;

      slides[STATE.currentIndex].classList.add("active");
    },

    moveSlide: (step) => {
      if (STATE.isAnimating) return;
      STATE.isAnimating = true;

      SliderManager.showSlide(STATE.currentIndex + step);
      SliderManager.resetAutoSlide();

      setTimeout(() => { STATE.isAnimating = false; }, CONFIG.animLockMs);
    },

    startAutoSlide: () => {
      clearInterval(STATE.autoSlideTimer);
      STATE.autoSlideTimer = setInterval(() => { 
        SliderManager.moveSlide(1); 
      }, CONFIG.autoSlideIntervalMs);
    },

    resetAutoSlide: () => {
      clearInterval(STATE.autoSlideTimer);
      if (STATE.sliderPosts.length > 1) SliderManager.startAutoSlide();
    },

    setupEvents: (wrapper, arrowPrev, arrowNext) => {
      if (arrowNext) arrowNext.addEventListener("click", () => SliderManager.moveSlide(1));
      if (arrowPrev) arrowPrev.addEventListener("click", () => SliderManager.moveSlide(-1));

      wrapper.addEventListener("mouseenter", () => clearInterval(STATE.autoSlideTimer), { passive: true });
      wrapper.addEventListener("mouseleave", SliderManager.resetAutoSlide, { passive: true });
      
      wrapper.addEventListener("touchstart", (e) => {
        clearInterval(STATE.autoSlideTimer);
        STATE.touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      wrapper.addEventListener("touchend", (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const diff = STATE.touchStartX - touchEndX;
        
        if (diff > 40) SliderManager.moveSlide(1);    
        else if (diff < -40) SliderManager.moveSlide(-1); 
        
        SliderManager.resetAutoSlide();
      }, { passive: true });
    }
  };

  // ==========================================
  // 6. ΕΚΚΙΝΗΣΗ
  // ==========================================
  document.addEventListener("DOMContentLoaded", ApiManager.fetchData);

})();

(() => {
    "use strict";

    // ==========================================
    // 1. CONFIGURATION & DATABASE
    // ==========================================
    const CONFIG = Object.freeze({
        closeDelay: 8000 // Χρόνος αναμονής (σε ms) πριν κλείσει το ευχαριστήριο μήνυμα
    });

    const QUESTIONS_DB = [
        { text: "Ποια ήταν η πιο αστεία ή η πιο ενδιαφέρουσα στιγμή από την τελευταία μας εκπαιδευτική επίσκεψη;", emoji: "🚌😆" },
        { text: "Ποια ήταν η αγαπημένη σας δραστηριότητα ή το πιο ενδιαφέρον πράγμα που ανακαλύψαμε αυτή την εβδομάδα στην τάξη;", emoji: "💡🏫" },
        { text: "Ποιο βιβλίο θα προτείνατε σε έναν φίλο σας να διαβάσει οπωσδήποτε αυτό το Σαββατοκύριακο και γιατί;", emoji: "📚🤓" },
        { text: "Αν μπορούσατε να αλλάξετε το τέλος από το παραμύθι/βιβλίο που διαβάσαμε σήμερα, πώς θα θέλατε να τελειώνει;", emoji: "✍️🐉" },
        { text: "Αν το σχολείο μας αποκτούσε τη δική του επίσημη μασκότ, τι ζώο ή πλάσμα θα ήταν και πώς θα την ονομάζαμε;", emoji: "🦄🐾" },
        { text: "Αν αναλαμβάνατε εσείς, ως δημοσιογράφοι, να γράψετε το επόμενο άρθρο στο blog μας, ποιο θέμα θα επιλέγατε να παρουσιάσετε;", emoji: "🎤🗞️" },
        { text: "Ποιο είναι το αγαπημένο σας ομαδικό παιχνίδι στην αυλή κατά τη διάρκεια του διαλείμματος και ποιοι είναι οι κανόνες του;", emoji: "⚽🏃‍♂️" },
        { text: "Αν μπορούσατε να ταξιδέψετε στο διάστημα, ποιον πλανήτη θα επισκεπτόσασταν πρώτο και γιατί;", emoji: "🚀🪐" },
        { text: "Ποιο είναι το αγαπημένο σας μάθημα στο σχολείο και τι σας αρέσει περισσότερο σε αυτό;", emoji: "📖✨" },
        { text: "Αν είχατε μια μαγική υπερδύναμη για μια μέρα στο σχολείο, ποια θα ήταν αυτή;", emoji: "🦸‍♂️⚡" },
        { text: "Ποια είναι η αγαπημένη σας υγιεινή γεύση για το κολατσιό στο διάλειμμα;", emoji: "🍎🥪" },
        { text: "Αν μπορούσατε να φέρετε ένα κατοικίδιο στην τάξη μας για μια μέρα, τι ζώο θα ήταν;", emoji: "🐶🐢" },
        { text: "Ποιο είναι το πιο ενδιαφέρον πείραμα που θα θέλατε να κάνουμε στο μάθημα της φυσικής/μελέτης;", emoji: "🔬🧪" },
        { text: "Αν γράφατε εσείς ένα βιβλίο, ποιος θα ήταν ο κεντρικός ήρωας και τι θα έκανε;", emoji: "✍️🦸‍♀️" },
        { text: "Ποιο τραγούδι ή τι είδος μουσικής σας κάνει να νιώθετε πιο χαρούμενοι όταν το ακούτε;", emoji: "🎵😊" },
        { text: "Αν το σχολείο μας είχε μια 'Ημέρα Χωρίς Μαθήματα', ποιες δραστηριότητες θα θέλατε να κάνουμε;", emoji: "🎨🧩" },
        { text: "Ποιο είναι το καλύτερο αστείο ή ανέκδοτο που ακούσατε πρόσφατα;", emoji: "😂🎭" },
        { text: "Αν μπορούσατε να ταξιδέψετε πίσω στον χρόνο, σε ποια ιστορική εποχή θα πηγαίνατε;", emoji: "⏳🏰" },
        { text: "Ποιο είναι το πιο όμορφο μέρος που έχετε επισκεφθεί σε σχολική εκδρομή ή με την οικογένειά σας;", emoji: "🏞️🗺️" },
        { text: "Αν φτιάχναμε μια χρονοκάψουλα για να την ανοίξουν οι μαθητές μετά από 10 χρόνια, τι θα βάζατε μέσα;", emoji: "📦🕰️" },
        { text: "Ποια είναι η αγαπημένη σας λέξη από όσες μάθαμε φέτος και τι σημαίνει;", emoji: "📝🧠" },
        { text: "Τι σας αρέσει να ζωγραφίζετε περισσότερο όταν έχετε ελεύθερο χρόνο;", emoji: "🖍️🖼️" },
        { text: "Πώς νομίζετε ότι θα μοιάζουν τα σχολεία στο μέλλον, σε 100 χρόνια από τώρα;", emoji: "🤖🏢" },
        { text: "Ποια καλή πράξη θα μπορούσαμε να κάνουμε όλοι μαζί ως τάξη για να βοηθήσουμε το περιβάλλον;", emoji: "🌳♻️" },
        { text: "Αν μπορούσατε να προσκαλέσετε έναν διάσημο (ήρωα, επιστήμονα, συγγραφέα) στην τάξη μας, ποιος θα ήταν;", emoji: "🤩🎙️" },
        { text: "Ποιο είναι το πιο περίεργο ή αστείο όνειρο που έχετε δει και θυμάστε;", emoji: "😴💭" },
        { text: "Αν είχατε ένα μαγικό ραβδί, ποιο πράγμα θα αλλάζατε στον κόσμο σήμερα;", emoji: "🪄🌍" },
        { text: "Τι σας έκανε να χαμογελάσετε περισσότερο σήμερα στο σχολείο ή ποια ευγενική πράξη είδατε να συμβαίνει;", emoji: "😊💖" },
        { text: "Αν μπορούσατε να δημιουργήσετε μια ολοκαίνουργια γιορτή, τι ακριβώς θα γιορτάζαμε και πώς;", emoji: "🎉🎈" },
        { text: "Αν ο αγαπημένος σας ήρωας κινουμένων σχεδίων ερχόταν στο σχολείο μας, τι θα κάνατε μαζί του;", emoji: "🦸‍♂️🎬" },
        { text: "Αν είχαμε ένα μαγικό δεντρόσπιτο στην αυλή του σχολείου, πού θα θέλατε να σας ταξιδέψει;", emoji: "🌳🏡" },
        { text: "Αν φτιάχνατε ένα νέο άθλημα για το μάθημα της γυμναστικής, πώς θα λεγόταν και με τι μπάλα θα παίζαμε;", emoji: "🏅🏐" },
        { text: "Αν τα ζώα μπορούσαν να μιλήσουν, ποιο πιστεύετε ότι θα είχε τις πιο αστείες ιστορίες να μας πει;", emoji: "🗣️🐒" },
        { text: "Αν ήσασταν ο μάγειρας του σχολείου για μία μέρα, ποιο φανταστικό γεύμα θα φτιάχνατε για όλα τα παιδιά;", emoji: "👨‍🍳🍝" },
        { text: "Αν υπήρχε ένα μαγικό φίλτρο που σας μάθαινε αμέσως κάτι καινούργιο, τι θα θέλατε να μάθετε να κάνετε;", emoji: "🧪💡" },
        { text: "Αν κατασκευάζαμε ένα ρομπότ για την τάξη μας, ποιες δουλειές ή δραστηριότητες θα του αναθέταμε να κάνει;", emoji: "🤖🔧" },
        { text: "Αν η τάξη μας γινόταν ταινία, ποιος θα ήταν ο τίτλος της και τι είδους ταινία θα ήταν (π.χ. περιπέτεια, κωμωδία);", emoji: "🍿🎥" },
        { text: "Αν οργανώναμε ένα κυνήγι θησαυρού στο σχολείο, πού θα κρύβατε εσείς τον χάρτη;", emoji: "🗺️🏴‍☠️" },
        { text: "Ποιο μουσικό όργανο θα θέλατε να μάθετε να παίζετε τέλεια και ποιο τραγούδι θα παίζατε πρώτο;", emoji: "🎸🎺" },
        { text: "Αν γνωρίζατε έναν φιλικό εξωγήινο, ποιο παιχνίδι από τη Γη θα του μαθαίνατε να παίζει στο διάλειμμα;", emoji: "👽🛸" },
        { text: "Αν μπορούσατε να σχεδιάσετε την ιδανική σχολική αίθουσα, τι παιχνίδι ή έπιπλο δεν θα έλειπε με τίποτα από μέσα;", emoji: "🛋️🏫" },
        { text: "Όταν μεγαλώσετε, ποιο επάγγελμα θα θέλατε να κάνετε και πώς θα βοηθάτε τους άλλους μέσα από αυτό;", emoji: "👩‍⚕️👷‍♂️" },
        { text: "Αν είχατε ένα ζευγάρι μαγικά παπούτσια, ποιες σούπερ ικανότητες θα σας έδιναν όταν τρέχετε;", emoji: "👟⚡" }
    ];

    // ==========================================
    // 2. DOM CACHE (Μνήμη Στοιχείων)
    // ==========================================
    const DOM = {
        wrapper: document.getElementById('mobile-quiz-wrapper'),
        form: document.getElementById('quiz-form-mobile'),
        trigger: document.getElementById('quiz-trigger-mobile'),
        iframe: document.getElementById('google-form-iframe-mobile'),
        qText: document.getElementById("q-text-mobile"),
        qEmoji: document.getElementById("q-emoji-mobile")
    };

    // ==========================================
    // 3. QUIZ MANAGER (Κεντρική Λογική)
    // ==========================================
    const QuizManager = {
        isOpen: false,
        formLoadCount: 0,

        init: () => {
            QuizManager.checkVisibility();
            if (DOM.qText && DOM.qEmoji) QuizManager.loadDailyQuestion();
            QuizManager.setupEvents();
        },

        // Έλεγχος: Εμφάνιση ΜΟΝΟ στην αρχική σελίδα
        checkVisibility: () => {
            const path = window.location.pathname;
            if (DOM.wrapper && (path === '/' || path === '/index.html')) {
                DOM.wrapper.classList.add('show-on-home');
            }
        },

        // Δυναμικός Αλγόριθμος Καθημερινής Ερώτησης (1-365)
        loadDailyQuestion: () => {
            const today = new Date();
            const startOfYear = new Date(today.getFullYear(), 0, 0);
            const diff = today - startOfYear + (startOfYear.getTimezoneOffset() - today.getTimezoneOffset()) * 60000;
            const dayOfYear = Math.floor(diff / 86400000); // Μέρα του χρόνου (π.χ. 185η μέρα)

            const dailyQ = QUESTIONS_DB[dayOfYear % QUESTIONS_DB.length];
            DOM.qText.innerText = dailyQ.text;
            DOM.qEmoji.innerHTML = dailyQ.emoji;
        },

        // Άνοιγμα Φόρμας
        open: (e) => {
            if (e) e.stopPropagation();
            if (!DOM.form || !DOM.trigger) return;

            QuizManager.isOpen = true;
            DOM.form.style.display = "block";
            DOM.trigger.style.display = "none";
        },

        // Κλείσιμο Φόρμας
        close: () => {
            if (!DOM.form || !DOM.trigger || !QuizManager.isOpen) return;

            QuizManager.isOpen = false;
            DOM.form.style.display = "none";
            DOM.trigger.style.display = "block";
        },

        // Διαχείριση Υποβολής Google Form (Ηack με το iframe)
        handleIframeLoad: () => {
            QuizManager.formLoadCount++;

            // Αν η φόρτωση είναι η 2η (δηλαδή πατήθηκε η "Υποβολή")
            if (QuizManager.formLoadCount === 2) {
                // Χρησιμοποιούμε κλάση CSS αντί για απευθείας style manipulation
                if (DOM.iframe) DOM.iframe.classList.add('is-submitted');

                // Αυτόματο κλείσιμο και επαναφορά
                setTimeout(() => {
                    QuizManager.close();
                    if (DOM.iframe) DOM.iframe.classList.remove('is-submitted');
                    QuizManager.formLoadCount = 0; 
                }, CONFIG.closeDelay);
            }
        },

        setupEvents: () => {
            // Κλείσιμο όταν ο χρήστης κάνει κλικ εκτός της φόρμας (Ασφαλές Event Delegation στο document)
            document.addEventListener('click', (e) => {
                if (QuizManager.isOpen && DOM.form && !DOM.form.contains(e.target) && !e.target.closest('#quiz-trigger-mobile')) {
                    QuizManager.close();
                }
            });
        }
    };

    // ==========================================
    // 4. BOOTSTRAP (Εκκίνηση & Global Exports)
    // ==========================================
    // Εκθέτουμε ΜΟΝΟ αυτές τις 2 συναρτήσεις στο global scope για να δουλεύουν τα HTML onclick/onload σου
    window.toggleQuizMobile = QuizManager.open;
    window.iframeLoadedMobile = QuizManager.handleIframeLoad;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", QuizManager.init);
    } else {
        QuizManager.init();
    }

})();

(() => {
    "use strict";

    // ==========================================
    // 1. CONFIGURATION & DICTIONARIES
    // ΕΔΩ ΜΠΟΡΕΙΣ ΝΑ ΠΡΟΣΘΕΤΕΙΣ ΟΣΑ ΔΕΔΟΜΕΝΑ ΘΕΛΕΙΣ
    // ==========================================
    const CONFIG = Object.freeze({
        weather: {
            lat: 40.2711,
            lon: 22.5044,
            url: "https://api.open-meteo.com/v1/forecast?latitude=40.2711&longitude=22.5044&hourly=temperature_2m,weather_code&timezone=auto&forecast_days=3"
        },
        layout: {
            breakpoint: 768
        },
        dictionaries: {
            fixedNames: {
                "1-1": "Βασίλης, Βασιλική", "1-2": "Σίλβεστρος", "1-6": "Φώτης, Φωτεινή, Ουρανία, Ιορδάνης", "1-7": "Γιάννης, Ιωάννα, Πρόδρομος", "1-11": "Θεοδόσιος, Θεοδοσία", "1-12": "Τατιανή", "1-17": "Αντώνης, Αντωνία", "1-18": "Αθανάσιος, Αθανασία, Κύριλλος", "1-20": "Ευθύμιος, Ευθυμία", "1-24": "Ξένη, Ξένια", "1-25": "Γρηγόρης, Μαργαρίτα", "2-1": "Τρύφων", "2-2": "Υπαπαντή (Παναγιώτης, Μαρία)", "2-3": "Σταμάτης, Σταματία", "2-8": "Ζαχαρίας", "2-10": "Χαράλαμπος, Χαρίκλεια", "2-11": "Βλάσης, Βλασία", "2-14": "Βαλεντίνος, Βαλεντίνα", "3-1": "Ευδοκία", "3-9": "Σαράντης", "3-17": "Αλέξιος, Αλεξία", "3-25": "Ευάγγελος, Ευαγγελία", "5-5": "Ειρήνη, Εφραίμ", "5-21": "Κωνσταντίνος, Ελένη", "6-8": "Καλλιόπη", "6-29": "Πέτρος, Παύλος", "6-30": "Απόστολος, Αποστολία", "7-7": "Κυριακή", "7-11": "Όλγα, Έφη (Ευφημία)", "7-17": "Μαρίνα, Αλίκη", "7-20": "Ηλίας", "7-24": "Χριστίνα", "7-26": "Παρασκευή, Εύη", "7-27": "Παντελής", "7-28": "Ειρήνη Χρυσοβαλάντου", "8-6": "Σωτήρης, Σωτηρία", "8-15": "Μαρία, Παναγιώτης, Δέσποινα", "8-30": "Αλέξανδρος, Αλεξάνδρα", "9-1": "Συμεών, Μυρτώ, Αθηνά, Αφροδίτη", "9-14": "✝️ Ύψωση του Τιμίου Σταυρού, Σταύρος, Σταυρούλα / 🕯️ Ημέρα Μνήμης Γενοκτονίας Ελλήνων Μικράς Ασίας", "9-17": "Σοφία, Πίστη, Ελπίδα, Αγάπη", "9-20": "Ευστάθιος, Στάθης, Ευσταθία",  "10-3": "Διονύσης, Διονυσία", "10-13": "🇬🇷 Ημέρα Μακεδονικού Αγώνα", "10-26": "Δημήτρης, Δήμητρα", "11-1": "Αργύρης, Αργυρώ, Κοσμάς, Δαμιανός", "11-8": "Μιχάλης, Άγγελος, Γαβριήλ", "11-9": "Νεκτάριος", "11-11": "Μηνάς", "11-13": "Χρυσόστομος", "11-14": "Φίλιππος, Φιλιππία", "11-21": "Μαρία, Δέσποινα (Εισόδια)", "11-25": "Κατερίνα", "11-26": "Στέλιος, Στέλλα", "11-30": "Ανδρέας, Ανδριανή", "12-4": "Βαρβάρα", "12-5": "Σάββας", "12-6": "Νικόλαος, Νικολέτα", "12-9": "Άννα", "12-12": "Σπυρίδων, Σπυριδούλα", "12-15": "Ελευθέριος, Ελευθερία", "12-25": "Χρήστος, Χρυσή, Μανώλης", "12-27": "Στέφανος, Στεφανία"
            },
            fixedHolidays: {
               "1-1": "🎉 Πρωτοχρονιά (Αργία)", "1-6": "🕊️ Θεοφάνεια (Αργία)", "1-30": "🏫 Τριών Ιεραρχών (Σχολική Εορτή)", "3-25": "🇬🇷 25η Μαρτίου (Εθνική Επέτειος) / 🕊️Ευαγγελισμός της Θεοτόκου", "5-1": "🌸 Εργατική Πρωτομαγιά", "8-15": "⛪ Κοίμηση της Θεοτόκου", "10-28": "🇬🇷 28η Οκτωβρίου (Εθνική Επέτειος)", "11-17": "🕊️ Επέτειος του Πολυτεχνείου", "11-25": "⛪ Αγίας Αικατερίνης (Τοπική Αργία Πολιούχου)", "12-18": "⛪ Αγίου Μοδέστου (Τοπική Αργία)", "12-25": "🎄 Χριστούγεννα", "12-26": "🎁 Σύναξη της Θεοτόκου"
            },
            worldDays: {
                "1-4": "📖 Παγκόσμια Ημέρα Γραφής/Κώδικα Μπράιγ", "1-21": "🫂 Παγκόσμια Ημέρα Αγκαλιάς", "1-24": "🌍 Διεθνής Ημέρα Εκπαίδευσης", "1-27": "🕯️ Διεθνής Ημέρα Μνήμης Θυμάτων Ολοκαυτώματος", "1-26": "⚡ Διεθνής Ημέρα Καθαρής Ενέργειας", "1-28": "🛡️ Ευρωπαϊκή Ημέρα Προστασίας των Προσωπικών Δεδομένων", "2-2": "🦆 Παγκόσμια Ημέρα Υγροτόπων", "2-4": "🎗️ Παγκόσμια Ημέρα κατά του Καρκίνου",  "2-9": "🇬🇷 Παγκόσμια Ημέρα Ελληνικής Γλώσσας", "2-10": "🍲 Παγκόσμια Ημέρα για τα όσπρια / 💍 Παγκόσμια Ημέρα του Γάμου", "2-11": "👩‍🔬 Διεθνής Ημέρα για τις Γυναίκες στην Επιστήμη  / 🚑 Ευρωπαϊκή Ημέρα του 112 / 🤒 Παγκόσμια Ημέρα Ασθενούς", "2-13": "📻 Παγκόσμια Ημέρα Ραδιοφώνου", "2-14": "🫀 Παγκόσμια Ημέρα Συγγενών Καρδιοπαθειών", "2-15": "🎗️ Παγκόσμια Ημέρα κατά του Παιδικού Καρκίνου", "2-20": "⚖️ Παγκόσμια Ημέρα Κοινωνικής Δικαιοσύνης", "2-21": "🗣️ Παγκόσμια Ημέρα Μητρικής Γλώσσας/ 🗺️ Παγκόσμια Ημέρα του Ξεναγού", "2-22": "🤔 Παγκόσμια Ημέρα Σκέψης / ⚖️ Ευρωπαϊκή Ημέρα για τα Θύματα Εγκληματικών Πράξεων", "2-28": "🧬 Παγκόσμια Ημέρα Σπάνιων Παθήσεων", "3-1": "🚫 Ημέρα Μηδενικών Διακρίσεων", "3-3": "🦁 Παγκόσμια Ημέρα Άγριας ζωής / 👂 Παγκόσμια Ημέρα Ακοής", "3-4": "⚖️ Παγκόσμια Ημέρα Παχυσαρκίας",  "3-5": "🕊️ Διεθνής Ημέρα Ενημέρωσης για τον Αφοπλισμό", "3-6": "🛑 Παγκόσμια Ημέρα κατά της Βίας", "3-8": "👩 Διεθνής Ημέρα της Γυναίκας", "3-11": "🧪 Παγκόσμια Ημέρα Χημείας", "3-12": "💻 Παγκόσμια Ημέρα κατά της Λογοκρισίας στο Διαδίκτυο", "3-14": "🔢 Παγκόσμια Ημέρα της Σταθεράς Π", "3-15": "🛒 Παγκόσμια Ημέρα Καταναλωτή / 🗣️Ημέρα Λόγου / ⚖️ Ημέρα Προστασίας Ανθρωπίνων Δικαιωμάτων & Πολιτικών Ελευθεριών", "3-18": "♻️ Παγκόσμια Ημέρα Ανακύκλωσης",  "3-20": "😊 Διεθνής Ημέρα Ευτυχίας / 🦷Ημέρα Στοματικής Υγείας / 🎭Διεθνής Ημέρα Θεάτρου για τα παιδιά ♈ /Διεθνής Ημέρα Αστρολογίας / 🇫🇷 Διεθνής Ημέρα Γαλλοφωνίας / 🥩 Διεθνής Ημέρα Χωρίς Κρέας ", "3-21": "📜 Παγκόσμια Ημέρα Ποίησης /🚫 Κατά Ρατσισμού / 🌳Ημέρα Δασών/ 🎭 Κουκλοθέατρου", "3-22": "💧 Παγκόσμια Ημέρα για το Νερό", "3-23": "⛅ Παγκόσμια Ημέρα Μετεωρολογίας", "3-24": "🫁 Παγκόσμια Ημέρα κατά της Φυματίωσης /💡 Δικαίωμα στην Αλήθεια", "3-25": "⛓️ Διεθνής Ημέρα Μνήμης Θυμάτων Δουλεμπορίου", "3-27": "🎭 Παγκόσμια Ημέρα Θεάτρου / 🤝 Διεθνής Ημέρα Κοινωνικής Εργασίας", "3-28": "👥 Παγκόσμια Ημέρα Θεάτρου Σκιών", "3-30": "♻️ Διεθνής Ημέρα Μηδενικής Σπατάλης", "4-1": "🤡 Πρωταπριλιά", "4-2": "🧩 Παγκόσμια Ημέρα Παιδικού Βιβλίου", "4-4": "🐕 Παγκόσμια Ημέρα Αδέσποτων Ζώων / 💣 Διεθνής Ημέρα κατά των Ναρκών", "4-5": "🧠 Διεθνής Ημέρα Συνείδησης", "4-6": "🕯️Ημέρα Μνήμης Θρακικού Ελληνισμού/🏅 Παγκόσμια Ημέρα Αθλητισμού", "4-7": "⚕️ Παγκόσμια Ημέρα Υγείας", "4-8": "⛺ Ημέρα του Έθνους των Ρομά", "4-11": "🧠 Παγκόσμια Ημέρα κατά της Ασθενείας Πάρκινσον", "4-12": "🚀 Διεθνής Ημέρα της Πτήσης στο Διάστημα / 🛣️ Παγκόσμια Ημέρα για τα Παιδιά του Δρόμου", "4-15": "🎨 Παγκόσμια Ημέρα Τέχνης", "4-16": "🗣️ Παγκόσμια Ημέρα Φωνής", "4-17": "🚜 Παγκόσμια Ημέρα Αγροτικής Πάλης", "4-18": "🏛️ Παγκόσμια Ημέρα Πολιτιστικής Κληρονομιάς", "4-20": "🇨🇳 Ημέρα Κινέζικης Γλώσσας", "4-21": "💡 Παγκόσμια Ημέρα Δημιουργικότητας", "4-22": "🌍 Διεθνής Ημέρα της Γης", "4-23": "📚 Παγκόσμια Ημέρα Βιβλίου / 🇬🇧 Ημέρα Αγγλικής Γλώσσας", "4-24": "🐭 Παγκόσμια Ημέρα Κατάργησης Πειραμάτων σε Ζώα", "4-25": "🦟 Παγκόσμια Ημέρα κατά της Ελονοσίας", "4-26": "©️ Παγκόσμια Ημέρα Πνευματικής Ιδιοκτησίας", "4-27": "✏️ Παγκόσμια Ημέρα Σχεδίου (Design)", "4-28": "👷 Παγκόσμια Ημέρα για την Υγεία στην Εργασία/ 🕯️ Διεθνής Ημέρα Μνήμης Εργατών", "4-29": "💃 Παγκόσμια Ημέρα Χορού / ☣️ Ημέρα Μνήμης για τα Θύματα του Χημικού Πολέμου / 🛡️ Παγκόσμια Ημέρα Ανοσολογίας", "4-30": "🎷 Διεθνής Ημέρα Τζαζ", "5-1": "🛠️ Διεθνής Ημέρα Εργατών",  "5-2": "🐟 Παγκόσμια Ημέρα Τόνου", "5-3": "📰 Παγκόσμια Ημέρα Ελευθεροτυπίας", "5-4": "🚒 Διεθνής Ημέρα Πυροσβεστών", "5-5": "👶 Διεθνής Ημέρα Μαιών", "5-8": "➕ Παγκόσμια Ημέρα Ερυθρού Σταυρού", "5-9": "🇪🇺 Ημέρα της Ευρώπης",  "5-11": "🦅 Παγκόσμια Ημέρα Αποδημητικών Πτηνών", "5-12": "🩺 Διεθνής Ημέρα Αδελφών Νοσοκόμων", "5-15": "👨‍👩‍👧‍👦 Διεθνής Ημέρα Οικογένειας", "5-17": "🏳️‍🌈 Διεθνής Ημέρα κατά της Ομοφοβίας/🛰️ Ημέρα Τηλεπικοινωνιών", "5-18": "🖼️ Παγκόσμια Ημέρα Μουσείων", "5-19": "🩺 Παγκόσμια Ημέρα κατά της Ηπατίτιδας / 🕯️ Ημέρα Μνήμης Γενοκτονίας Ποντίων", "5-20": "🐝 Παγκόσμια Ημέρα Μέλισσας", "5-21": "🌍 Παγκόσμια Ημέρα Πολιτισμού", "5-22": "🌿 Παγκόσμια Ημέρα Βιοποικιλότητας", "5-24": "🏞️ Ευρωπαϊκή Ημέρα Πάρκων", "5-25": "👧 Διεθνής Ημέρα Εξαφανισμένων Παιδιών / ⚽ Παγκόσμια Ημέρα Ποδοσφαίρου", "5-31": "🚭 Παγκόσμια Ημέρα κατά του Καπνίσματος", "6-1": "👨‍👩‍👦 Παγκόσμια Ημέρα Γονέων / 🥛 Παγκόσμια Ημέρα Γάλακτος", "6-3": "🚲 Παγκόσμια Ημέρα Ποδηλάτου", "6-4": "🧒 Διεθνής Ημέρα κατά της Επιθετικότητας εναντίον Αθώων Παιδιών", "6-5": "🌳 Παγκόσμια Ημέρα Περιβάλλοντος", "6-7": "🍽️ Παγκόσμια Ημέρα για την Ασφάλεια Τροφίμων", "6-8": "🌊 Παγκόσμια Ημέρα Ωκεανών", "6-11": "🧸 Διεθνής Ημέρα Παιχνιδιού", "6-12": "🚸 Παγκόσμια Ημέρα κατά της Παιδικής Εργασίας", "6-14": "🩸 Παγκόσμια Ημέρα Εθελοντή Αιμοδότη", "6-15": "🧓 Παγκόσμια Ημέρα Ενημέρωσης για την Κακοποίηση των Ηλικιωμένων/ Παγκόσμια Ημέρα Γονιμότητας / 🌬️ Παγκόσμια Ημέρα Ανέμου", "6-17": "🌵 Παγκόσμια Ημέρα κατά της Ξηρασίας και της Ερημοποίησης", "6-20": "🚶 Παγκόσμια Ημέρα Προσφύγων", "6-21": "🎵 Ευρωπαϊκή Ημέρα Μουσικής", "6-23": "🏅 Ολυμπιακή Ημέρα / 🏛️ Ημέρα των Ηνωμένων Εθνών για τη Δημόσια Υπηρεσία", "6-25": "⚓ Ημέρα των Ναυτικών", "6-26": "🚫 Παγκόσμια Ημέρα κατά των Ναρκωτικών / ⛓️ Διεθνής Ημέρα κατά των Βασανιστηρίων", "6-27": "🏢 Διεθνής Ημέρα Μικρομεσαίων Επιχειρήσεων / 🦻 Διεθνής Ημέρα Κώφωσης και Τυφλότητας", "6-30": "☄️ Διεθνής Ημέρα Αστεροϊδών / 🏛️ Διεθνής Ημέρα Κοινοβουλευτισμού", "7-11": "👥 Παγκόσμια Ημέρα Πληθυσμού", "7-12": "🕊️ Διεθνής Ημέρα Ελπίδας", "7-17": "⚖️ Παγκόσμια Ημέρα Διεθνούς Δικαιοσύνης", "7-18": "✊ Διεθνής Ημέρα Νέλσον Μαντέλα", "7-20": "♟️ Παγκόσμια Ημέρα Σκακιού", "7-25": "🏊 Παγκόσμια Ημέρα Πρόληψης των Πνιγμών /⚖️ Δικαστική Ευημερία", "7-28": "🩺 Παγκόσμια Ημέρα κατά της Ηπατίτιδας", "7-30": "🤝 Διεθνής Ημέρα Φιλίας", "8-1": "🤱 Παγκόσμια Ημέρα (Εβδομάδα) Μητρικού Θηλασμού", "8-9": "🏕️ Παγκόσμια Ημέρα Ιθαγενών Λαών", "8-12": "🧑‍🦱 Παγκόσμια Ημέρα Νεολαίας", "8-19": "📸 Παγκόσμια Ημέρα Φωτογραφίας / 🤝 Παγκόσμια Ανθρωπιστική Ημέρα", "8-21": "🕯️ Διεθνής Ημέρα Μνήμης Θυμάτων Τρομοκρατίας", "8-23": "⛓️ Παγκόσμια Ημέρα για την Υπενθύμιση του Δουλεμπορίου και της Κατάργησής του",  "8-27": "🌊 Παγκόσμια Ημέρα Λιμνών", "8-30": "❓ Διεθνής Ημέρα Εξαφανισμένων",  "9-5": "🤝 Διεθνής Ημέρα Φιλανθρωπίας", "9-8": "📖 Διεθνής Ημέρα Εγγραμματισμού", "9-15": "🗳️ Διεθνής Ημέρα Δημοκρατίας", "9-16": "🛡️ Διεθνής Ημέρα για το Όζον", "9-17": "🏥 Διεθνής Ημέρα Ασφάλειας Ασθενών", "9-20": "🧹 Παγκόσμια Ημέρα Καθαριότητας", "9-21": "🕊️ Διεθνής Ημέρα Ειρήνης / 🧠 Παγκόσμια Ημέρα Αλτσχάιμερ", "9-22": "🚫🚗 Παγκόσμια Ημέρα Χωρίς Αυτοκίνητο", "9-26": "🗣️ Ευρωπαϊκή Ημέρα Γλωσσών", "9-27": "✈️ Παγκόσμια Ημέρα Τουρισμού", "9-29": "❤️ Παγκόσμια Ημέρα Καρδιάς", "9-30": "🗣️ Διεθνής Ημέρα Μετάφρασης", "10-1": "🧓 Παγκόσμια Ημέρα Τρίτης Ηλικίας", "10-2": "☮️ Διεθνής Ημέρα Μη Βίας", "10-4": "🐾 Παγκόσμια Ημέρα των Ζώων", "10-5": "👨‍🏫 Παγκόσμια Ημέρα Εκπαιδευτικών", "10-9": "✉️ Παγκόσμια Ημέρα Ταχυδρομείων", "10-10": "🧠 Παγκόσμια Ημέρα Ψυχικής Υγείας / ⚖️ Παγκόσμια Ημέρα κατά της Θανατικής Ποινής", "10-11": "👧 Διεθνής Ημέρα Κοριτσιού", "10-13": "🌪️ Διεθνής Ημέρα Μείωσης Φυσικών Καταστροφών", "10-15": "🧼 Παγκόσμια Ημέρα Πλυσίματος Χεριών / 🦯 Διεθνής Ημέρα του Λευκού Μπαστουνιού / 👩‍🌾 Διεθνής Ημέρας Αγρότισσας",  "10-16": "🇬🇷 Απελευθέρωση Κατερίνης / 🍎 Παγκόσμια Ημέρα Διατροφής / 🦴 Παγκόσμια Ημέρα Σπονδυλικής Στήλης", "10-17": "📉 Διεθνής Ημέρα Εξάλειψης Φτώχειας", "10-24": "🇺🇳 Ημέρα Ηνωμένων Εθνών / 🌊 Μεσογειακή Ημέρα Ακτών", "10-27": "🎞️ Παγκόσμια Ημέρα Οπτικοακουστικής Κληρονομιάς", "10-28": "🎬 Διεθνής Ημέρα Κινουμένου Σχεδίου", "10-29": "🤝 Διεθνής Ημέρα Φροντίδας και Στήριξης", "10-31": "🏦 Παγκόσμια Ημέρα Αποταμίευσης", "11-9": "🚫 Διεθνής Ημέρα κατά του Φασισμού και του Αντισημιτισμού", "11-10": "🔬 Παγκόσμια Ημέρα Επιστήμης για την Ειρήνη και την Ανάπτυξη", "11-13": "🤗 Παγκόσμια Ημέρα Καλοσύνης",  "11-14": "🩸 Παγκόσμια Ημέρα Διαβήτη", "11-16": "🤝 Διεθνής Ημέρα Ανεκτικότητας / 🥗 Διεθνής Ημέρα Μεσογειακής Διατροφής", "11-19": "👨 Παγκόσμια Ημέρα Ανδρών", "11-20": "👦👧 Παγκόσμια Ημέρα Δικαιωμάτων Παιδιού", "11-21": "📺 Παγκόσμια Ημέρα Τηλεόρασης / 👋 Παγκόσμια Ημέρα Χαιρετισμού", "11-25": "🛑 Διεθνής Ημέρα κατά της Βίας κατά των Γυναικών", "12-1": "🎗️ Παγκόσμια Ημέρα κατά του AIDS", "12-2": "⛓️ Διεθνής Ημέρα για την Κατάργηση της Δουλείας", "12-3": "♿ Παγκόσμια Ημέρα Ατόμων με Αναπηρία", "12-5": "🙋 Παγκόσμια Ημέρα Εθελοντισμού", "12-7": "✈️ Διεθνής Ημέρα Πολιτικής Αεροπορίας", "12-9": "⚖️ Παγκόσμια Ημέρα κατά της Διαφθοράς/ 🕯️ Διεθνής Ημέρα Μνήμης Θυμάτων Γενοκτονίας", "12-10": "🕊️ Παγκόσμια Ημέρα Ανθρωπίνων Δικαιωμάτων / ©️ Παγκόσμια Ημέρα Ιδιοκτησίας", "12-11": "👶 Παγκόσμια Ημέρα Παιδιού (UNICEF) / ⛰️ Διεθνής Ημέρα Βουνών", "12-14": "❤️ Παγκόσμια Ημέρα Αγάπης",  "12-18": "🚶 Διεθνής Ημέρα Μεταναστών", "12-20": "🤝 Διεθνής Ημέρα Ανθρώπινης Αλληλεγγύης"
            }
        }
    });

    // ==========================================
    // 2. UTILITIES (Μαθηματικά Εργαλεία Ημερομηνιών)
    // ==========================================
    const Utils = {
        debounce: (func, delay) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), delay);
            };
        },
        // Βρίσκει την "n-οστή" ημέρα του μήνα (π.χ. 2η Κυριακή του Μαΐου)
        getNthDayOfMonth: (year, month, dayOfWeek, n) => {
            const firstDay = new Date(year, month - 1, 1).getDay();
            const offset = (dayOfWeek - firstDay + 7) % 7;
            return 1 + offset + (n - 1) * 7;
        },
        // Βρίσκει την Τελευταία ημέρα (π.χ. Τελευταία Παρασκευή) του μήνα
        getLastDayOfMonth: (year, month, dayOfWeek) => {
            const d = new Date(year, month, 0); // Τελευταία μέρα του μήνα
            const offset = (d.getDay() - dayOfWeek + 7) % 7;
            return d.getDate() - offset;
        },
        getOrthodoxEaster: (year) => {
            const a = year % 19, b = year % 4, c = year % 7;
            const d = (19 * a + 15) % 30;
            const e = (2 * b + 4 * c + 6 * d + 6) % 7;
            const easterDate = new Date(year, 2, 22);
            easterDate.setDate(easterDate.getDate() + (d + e + 13));
            return easterDate;
        },
        // Υπολογισμός διαφοράς ημερών χωρίς bugs από την αλλαγή ώρας (DST)
        getDaysDiff: (date1, date2) => {
            const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
            const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
            return Math.round((utc1 - utc2) / (1000 * 60 * 60 * 24));
        }
    };

    // ==========================================
    // 3. DATE ENGINE (Υπολογισμός όλων των κινητών ημερών)
    // ==========================================
    const DateEngine = {
        today: new Date(),
        init: function() {
            this.y = this.today.getFullYear();
            this.m = this.today.getMonth() + 1;
            this.d = this.today.getDate();
            this.dateKey = `${this.m}-${this.d}`;
            
            this.easter = Utils.getOrthodoxEaster(this.y);
            this.diffFromEaster = Utils.getDaysDiff(this.today, this.easter);
            this.isLeapYear = (this.y % 4 === 0 && this.y % 100 !== 0) || (this.y % 400 === 0);
            this.isGeorgeMoved = (this.easter >= new Date(this.y, 3, 23));

            this.calculateMovableWorldDays();
        },

        calculateMovableWorldDays: function() {
            const y = this.y;
            // Υπολογισμός Ισημερίας για Ύπνο και Αφήγηση
            const eq = new Date(y, 2, 20);
            const sleepOffset = ((eq.getDay() + 1) % 7) + 1;
            const sleepDate = new Date(y, 2, 20 - sleepOffset);
            const storytellingDay = Math.floor(20.25 - (y - 2000) * 0.0025);

            this.movableDays = {
                isSleepDay: (this.m === sleepDate.getMonth() + 1 && this.d === sleepDate.getDate()),
                isStorytellingDay: (this.m === 3 && this.d === storytellingDay),
                isMotherDay: (this.m === 5 && this.d === Utils.getNthDayOfMonth(y, 5, 0, 2)),
                isFatherDay: (this.m === 6 && this.d === Utils.getNthDayOfMonth(y, 6, 0, 3)),
                isSaferInternetDay: (this.m === 2 && this.d === Utils.getNthDayOfMonth(y, 2, 2, 2)),
                isSmileDay: (this.m === 10 && this.d === Utils.getNthDayOfMonth(y, 10, 5, 1)),
                isTrafficVictimsDay: (this.m === 11 && this.d === Utils.getNthDayOfMonth(y, 11, 0, 3)),
                isVetDay: (this.m === 4 && this.d === Utils.getLastDayOfMonth(y, 4, 6)),
                isProgrammerDay: (this.m === 9 && this.d === (this.isLeapYear ? 12 : 13)),
                isCoastalCleanup: (this.m === 9 && this.d === Utils.getNthDayOfMonth(y, 9, 6, 3)),
                isResearchersNight: (this.m === 9 && this.d === Utils.getLastDayOfMonth(y, 9, 5)),
                isBirdwatch: (this.m === 10 && (this.d === Utils.getNthDayOfMonth(y, 10, 6, 1) || this.d === Utils.getNthDayOfMonth(y, 10, 0, 1))),
                isHabitatArchDay: (this.m === 10 && this.d === Utils.getNthDayOfMonth(y, 10, 1, 1)),
                isSightDay: (this.m === 10 && this.d === Utils.getNthDayOfMonth(y, 10, 4, 2)),
                isPhilosophyDay: (this.m === 11 && this.d === Utils.getNthDayOfMonth(y, 11, 4, 3)),
                isBuyNothingDay: (this.m === 11 && this.d === (Utils.getNthDayOfMonth(y, 11, 4, 4) + 1)),
                isMaritimeDay: (this.m === 9 && this.d === Utils.getLastDayOfMonth(y, 9, 4)),
                isLighthouseDay: (this.m === 8 && (this.d === Utils.getNthDayOfMonth(y, 8, 6, 3) || this.d === Utils.getNthDayOfMonth(y, 8, 0, 3))),
                isHospiceDay: (this.m === 10 && this.d === Utils.getNthDayOfMonth(y, 10, 6, 2)),
                isNoiseDay: (this.m === 4 && this.d === Utils.getLastDayOfMonth(y, 4, 3))
            };
        }
    };

    // ==========================================
    // 4. HOLIDAY ENGINE (Διαχείριση Περιεχομένου Εορτολογίου)
    // ==========================================
    const HolidayEngine = {
        getWorldDays: () => {
            let days = [];
            if (CONFIG.dictionaries.worldDays[DateEngine.dateKey]) days.push(CONFIG.dictionaries.worldDays[DateEngine.dateKey]);
            
            const mov = DateEngine.movableDays;
            if (mov.isSleepDay) days.push("💤 Παγκόσμια Ημέρα Ύπνου");
            if (mov.isStorytellingDay) days.push("📖 Παγκόσμια Ημέρα Αφήγησης");
            if (mov.isMotherDay) days.push("🌸 Γιορτή της Μητέρας");
            if (mov.isFatherDay) days.push("👔 Γιορτή του Πατέρα");
            if (mov.isSaferInternetDay) days.push("🔒 Ημέρα Ασφαλούς Διαδικτύου");
            if (mov.isSmileDay) days.push("😁 Παγκόσμια Ημέρα Χαμόγελου");
            if (mov.isTrafficVictimsDay) days.push("🚗 Παγκόσμια Ημέρα Μνήμης Θυμάτων Τροχαίων Ατυχημάτων");
            if (mov.isVetDay) days.push("⚕️ Παγκόσμια Ημέρα Κτηνιατρικής");
            if (mov.isProgrammerDay) days.push("💻 Παγκόσμια Ημέρα Προγραμματιστή");
            if (mov.isCoastalCleanup) days.push("🏖️ Παγκόσμια Ημέρα Εθελοντικού Καθαρισμού των Ακτών / 🐧 Παγκόσμια Ημέρα Ελεύθερου Λογισμικού");
            if (mov.isResearchersNight) days.push("🔬 Βραδιά του Ερευνητή");
            if (mov.isBirdwatch) days.push("🐦 Πανευρωπαϊκή Γιορτή των Πουλιών");
            if (mov.isHabitatArchDay) days.push("🏘️ Παγκόσμια Ημέρα Κατοικίας / 🏛️ Παγκόσμια Ημέρα Αρχιτεκτονικής");
            if (mov.isSightDay) days.push("👁️ Παγκόσμια Ημέρα Όρασης - Κατά της Τύφλωσης");
            if (mov.isPhilosophyDay) days.push("🤔 Παγκόσμια Ημέρα Φιλοσοφίας");
            if (mov.isBuyNothingDay) days.push("🛍️ Παγκόσμια Ημέρα Αγοραστικής Αποχής");
            if (mov.isMaritimeDay) days.push("⚓ Παγκόσμια Ναυτική Ημέρα");
            if (mov.isLighthouseDay) days.push("🗼 Παγκόσμια Ημέρα Φάρων");
            if (mov.isHospiceDay) days.push("🏥 Παγκόσμια Ημέρα Ξενώνων και Παρηγορητικής Φροντίδας");
            if (mov.isNoiseDay) days.push("🤫 Διεθνής Ημέρα κατά του Θορύβου");

            return days;
        },

        getHolidays: () => {
            let holidays = [];
            const diff = DateEngine.diffFromEaster;

            if (diff === -59) holidays.push("🍖 Τσικνοπέμπτη!");
            else if (diff === -48) holidays.push("🪁 Καθαρά Δευτέρα (Αργία)");
            else if (diff === -42) holidays.push("⛪ Κυριακή της Ορθοδοξίας");
            else if (diff === -28) holidays.push("✝️ Κυριακή της Σταυροπροσκυνήσεως");
            else if (diff === -16) holidays.push("⛪ Παρασκευή του Ακαθίστου Ύμνου");
            else if (diff === -8) holidays.push("🌿 Σάββατο του Λαζάρου");
            else if (diff === -7) holidays.push("🌿 Κυριακή των Βαΐων");
            else if (diff === -2) holidays.push("⛪ Μεγάλη Παρασκευή (Ημιαργία)");
            else if (diff === 0) holidays.push("🕯️ Κυριακή του Πάσχα");
            else if (diff === 1) holidays.push("🥚 Δευτέρα του Πάσχα (Αργία)");
            else if (diff === 5) holidays.push("💧 Ζωοδόχου Πηγής");
            else if (diff === 39) holidays.push("⛪ Ανάληψη του Κυρίου");
            else if (diff === 49) holidays.push("🔥 Πεντηκοστή");
            else if (diff === 50) holidays.push("🕊️ Αγίου Πνεύματος (Αργία)");
            else if (diff === 56) holidays.push("⛪ Κυριακή των Αγίων Πάντων");

            if (CONFIG.dictionaries.fixedHolidays[DateEngine.dateKey]) {
                holidays.push(CONFIG.dictionaries.fixedHolidays[DateEngine.dateKey]);
            }
            return holidays;
        },

        getNames: () => {
            const diff = DateEngine.diffFromEaster;
            const isMoved = DateEngine.isGeorgeMoved;

            if (diff === -43) return "Θεόδωρος, Θεοδώρα (Αγ. Θεοδώρων)";
            if (diff === -8) return "Λάζαρος, Λάζος (Του Λαζάρου)";
            if (diff === -7) return "Βάιος, Βαΐα, Δάφνη (Των Βαΐων)";
            if (diff === 0) return "Αναστάσιος, Αναστασία, Λάμπρος, Πασχάλης";
            if (diff === 1) return isMoved ? "Γιώργος, Γεωργία, Ελισάβετ" : "";
            if (diff === 2) return "Ραφαήλ, Νικόλαος, Ειρήνη (Λέσβου)";
            if (diff === 5) return "Ζωή, Πηγή, Ζωοδόχος (Ζωοδόχου Πηγής)";
            if (diff === 7) return "Θωμάς (Του Θωμά)";
            if (diff === 50) return "Τριάδα, Τριαντάφυλλος, Τριανταφυλλιά";
            if (diff === 56) return "Πανταζής, Πάντος (Αγίων Πάντων)";
            
            if (DateEngine.dateKey === "4-23") return isMoved ? "" : "Γιώργος, Γεωργία";
            if (DateEngine.dateKey === "4-24") return isMoved ? "" : "Ελισάβετ";
            
            return CONFIG.dictionaries.fixedNames[DateEngine.dateKey] || "";
        },

        getSchoolHolidays: () => {
            const m = DateEngine.m;
            const d = DateEngine.d;
            const diff = DateEngine.diffFromEaster;

           if ((m === 12 && d >= 24) || (m === 1 && d <= 7)) return " \u26C4\uFE0F Σχολικές Διακοπές Χριστουγέννων";
           if (diff >= -8 && diff <= 7) return " \uD83D\uDC30\uFE0F Σχολικές Διακοπές Πάσχα";
            if ((m === 6 && d >= 16) || m === 7 || m === 8 || (m === 9 && d <= 10)) return " \u2600\uFE0F Θερινές Σχολικές Διακοπές";
        }
    };

    // ==========================================
    // 5. WEATHER ENGINE (Με αυτόματη επαναπροσπάθεια)
    // ==========================================
    const WeatherEngine = {
        fetchWithRetry: async (retries = 3) => {
            try {
                const response = await fetch(CONFIG.weather.url);
                if (!response.ok) throw new Error("HTTP error " + response.status);
                return await response.json();
            } catch (error) {
                if (retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return WeatherEngine.fetchWithRetry(retries - 1);
                }
                throw error;
            }
        },

        getDayTypeContent: (data, dayOffset) => {
            const dDate = new Date();
            dDate.setDate(DateEngine.today.getDate() + dayOffset);
            
            const m = dDate.getMonth() + 1;
            const d = dDate.getDate();
            const dayOfWeek = dDate.getDay();
            const diffFromEaster = Utils.getDaysDiff(dDate, DateEngine.easter);
            
            const schoolHolidays = ["10-28", "11-17", "11-25", "1-30", "3-25", "5-1"];
            const isHoliday = schoolHolidays.includes(`${m}-${d}`) || diffFromEaster === -48 || diffFromEaster === 50;

            if (dayOfWeek === 0 || dayOfWeek === 6) return '<span class="sch-msg">🎈 Καλό</span><span class="sch-msg">Σ/Κ!</span>';
            if ((m === 6 && d >= 16) || m === 7 || m === 8 || (m === 9 && d <= 10)) return '<span class="sch-msg">🏖️ Καλό</span><span class="sch-msg">Καλο-<br>καίρι!</span>';
            if ((m === 12 && d >= 24) || (m === 1 && d <= 7)) return '<span class="sch-msg">🎄 Καλές</span><span class="sch-msg">Γιορτές!</span>';
            if (diffFromEaster >= -8 && diffFromEaster <= 7) return '<span class="sch-msg">🐰 Καλό</span><span class="sch-msg">Πάσχα!</span>';
            if (isHoliday) return '<span class="sch-msg">🇬🇷 Χρόνια</span><span class="sch-msg">Πολλά!</span>';

            // Έλεγχος Καιρού Διαλειμμάτων
            const codes = {
                0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 48:"🌫️", 51:"🌦️", 53:"🌦️", 55:"🌧️",
                61:"🌧️", 63:"🌧️", 65:"🌧️", 71:"❄️", 73:"❄️", 75:"❄️", 77:"❄️", 80:"🌦️",
                81:"🌧️", 82:"🌧️", 95:"⛈️", 96:"⛈️", 99:"⛈️"
            };
            
            const baseIndex = dayOffset * 24;
            const rainCodes = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99];
            const snowCodes = [71, 73, 75, 77];
            let rainWarnings = [], snowWarnings = [];

            [10, 11, 12, 13].forEach(hour => {
                const code = data.hourly.weather_code[baseIndex + hour];
                const timeLabel = hour === 10 ? "09:40" : hour === 11 ? "11:30" : hour === 12 ? "12:25" : "13:15";
                if (rainCodes.includes(code)) rainWarnings.push(timeLabel);
                if (snowCodes.includes(code)) snowWarnings.push(timeLabel);
            });

            if (snowWarnings.length > 0) {
                const badges = snowWarnings.map(t => `<span class="snow-badge">Διάλειμμα ${t}</span>`).join('');
                return `<span class="sch-msg" style="font-size:22px; margin-bottom:2px; animation: bounce 2s infinite; color:#1e6cff;">❄️</span><span class="sch-msg" style="font-size:9px; line-height:1; margin-bottom:4px; color:#1e6cff;">ΧΙΟΝΟΠΤΩΣΗ ΣΤΑ ΔΙΑΛΕΙΜΜΑΤΑ:</span><div class="snow-list">${badges}</div>`;
            } 
            if (rainWarnings.length > 0) {
                const badges = rainWarnings.map(t => `<span class="rain-badge">Διάλειμμα ${t}</span>`).join('');
                return `<span class="sch-msg" style="font-size:20px; margin-bottom:2px; animation: bounce 2s infinite;">☔</span><span class="sch-msg" style="font-size:9px; line-height:1; margin-bottom:4px;">ΒΡΟΧΗ ΣΤΑ ΔΙΑΛΕΙΜΜΑΤΑ:</span><div class="rain-list">${badges}</div>`;
            }

            // Κανονική Μέρα χωρίς φαινόμενα
            const getHourData = (h) => {
                const temp = Math.round(data.hourly.temperature_2m[baseIndex + h]);
                const icon = codes[data.hourly.weather_code[baseIndex + h]] || "🌤️";
                return `${icon} ${temp}°`;
            };

            return `<span class="sch-time">🔔 09:40 ${getHourData(10)}</span>
                    <span class="sch-time">🔔 11:30 ${getHourData(11)}</span>
                    <span class="sch-time">🔔 12:25 ${getHourData(12)}</span>
                    <span class="sch-time" style="color:#a90e0e; margin-top:3px;">🎒 13:15 ${getHourData(13)}</span>`;
        }
    };

    // ==========================================
    // 6. UI & LAYOUT MANAGER (Μόνο ζωγραφίζει, δεν υπολογίζει)
    // ==========================================
    const UIEngine = {
        renderHeader: () => {
            document.getElementById('dynamic-day-icon').innerText = DateEngine.d;
            document.getElementById('eort-date').innerText = DateEngine.today.toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long' });
            if (DateEngine.diffFromEaster === -48) {
                document.getElementById('main-icon').innerText = "🪁";
            }
        },

        renderHolidays: () => {
            const worldDays = HolidayEngine.getWorldDays();
            const wdDiv = document.getElementById('eort-world-day');
            wdDiv.innerHTML = worldDays.join(" / ");
            wdDiv.style.display = worldDays.length ? "block" : "none";

            const holidays = HolidayEngine.getHolidays();
            const hDiv = document.getElementById('eort-holiday');
            hDiv.innerHTML = holidays.join("<br>");
            hDiv.style.display = holidays.length ? "block" : "none";

            const names = HolidayEngine.getNames();
            const nDiv = document.getElementById('eort-names');
            if (names) {
                nDiv.innerHTML = "<b>Γιορτάζουν:</b><br>" + names;
                nDiv.style.display = "block";
            } else {
                nDiv.style.display = "none";
            }

            const schoolStr = HolidayEngine.getSchoolHolidays();
            const sDiv = document.getElementById('eort-school');
            sDiv.innerText = schoolStr;
            sDiv.style.display = schoolStr ? "block" : "none";
        },

        renderWeather: async () => {
            const container = document.getElementById('hub-weather-container');
            try {
                const data = await WeatherEngine.fetchWithRetry();
                const codes = {
                    0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 48:"🌫️", 51:"🌦️", 53:"🌦️", 55:"🌧️",
                    61:"🌧️", 63:"🌧️", 65:"🌧️", 71:"❄️", 73:"❄️", 75:"❄️", 77:"❄️", 80:"🌦️",
                    81:"🌧️", 82:"🌧️", 95:"⛈️", 96:"⛈️", 99:"⛈️"
                };
                const daysArr = ['Κυρ','Δευ','Τρι','Τετ','Πεμ','Παρ','Σαβ'];
                let wHtml = '';

                for(let i=0; i<3; i++) {
                    const dDate = new Date();
                    dDate.setDate(DateEngine.today.getDate() + i);
                    const dName = (i===0) ? "Σήμερα" : (i===1 ? "Αύριο" : daysArr[dDate.getDay()]);
                    
                    const baseIndex = i * 24;
                    const dayTemps = data.hourly.temperature_2m.slice(baseIndex, baseIndex + 24);
                    const maxTemp = Math.round(Math.max(...dayTemps));
                    const minTemp = Math.round(Math.min(...dayTemps));
                    const mainCode = codes[data.hourly.weather_code[baseIndex + 12]] || "🌤️";
                    const hoverContent = WeatherEngine.getDayTypeContent(data, i);

                    wHtml += `
                        <div class="c-day-card ${i===0 ? 'today' : ''}">
                            <div class="c-day-inner">
                                <div class="c-day-front">
                                    <span class="c-day-name">${dName}</span>
                                    <span class="c-day-icon">${mainCode}</span>
                                    <div class="c-day-temps"><span class="c-max">${maxTemp}°</span> <span>${minTemp}°</span></div>
                                </div>
                                <div class="c-day-back">${hoverContent}</div>
                            </div>
                        </div>`;
                }
                container.innerHTML = wHtml;
            } catch (error) {
                container.innerHTML = "<div style='font-size:10px;color:#888;width:100%;text-align:center;'>Η υπηρεσία καιρού είναι προσωρινά μη διαθέσιμη.</div>";
            }
        },

        moveLayout: () => {
            const eortOrig = document.getElementById("eortologio-original-location");
            const eortGadget = document.querySelector(".combined-widget");
            if (!eortOrig || !eortGadget) return;

            let eortBase = document.getElementById("eortologio-mobile-base");
            if (!eortBase) {
                eortBase = Object.assign(document.createElement("div"), {id: "eortologio-mobile-base", className: "widget"});
            }

            if (window.innerWidth <= CONFIG.layout.breakpoint) {
                let target = document.getElementById("bellTracker") || document.getElementById("HTML32");
                if (target) {
                    if (eortBase.parentNode !== target.parentNode) target.after(eortBase);
                    if (eortGadget.parentNode !== eortBase) eortBase.appendChild(eortGadget);
                }
            } else if (eortOrig.parentNode) {
                if (eortGadget.parentNode !== eortOrig.parentNode) eortOrig.parentNode.insertBefore(eortGadget, eortOrig.nextSibling);
                if (eortBase.parentNode) eortBase.parentNode.removeChild(eortBase);
            }
        }
    };

    // ==========================================
    // 7. BOOTSTRAP (Εκκίνηση)
    // ==========================================
    const AppController = {
        init: () => {
            DateEngine.init();
            UIEngine.renderHeader();
            UIEngine.renderHolidays();
            UIEngine.renderWeather(); // Τρέχει ασύγχρονα στο παρασκήνιο

            UIEngine.moveLayout();
            window.addEventListener("resize", Utils.debounce(UIEngine.moveLayout, 150), { passive: true });
            window.addEventListener("load", UIEngine.moveLayout, { once: true });
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", AppController.init);
    } else {
        AppController.init();
    }

})();

(() => {
    "use strict";

    // ==========================================
    // 1. CONFIGURATION (Ρυθμίσεις)
    // ==========================================
    const CONFIG = Object.freeze({
        feedUrl: 'https://dimperist.blogspot.com/feeds/posts/default?alt=json&max-results=500',
        mobileBreakpoint: 1140, // Για τη συμπεριφορά του Tooltip/Modal
        layoutBreakpoint: 768,  // Για τη μετακίνηση του Widget
        tooltipDelay: 200,
        quotes: [
            "Κάθε μέρα είναι μια νέα ευκαιρία για παιχνίδι και γνώση!",
    "Το χαμόγελό σου μπορεί να φωτίσει ολόκληρη την τάξη!",
    "Μην σταματάς ποτέ να ρωτάς «γιατί» έτσι ανακαλύπτεις τον κόσμο!",
    "Είσαι μοναδικός και έχεις υπέροχες ιδέες να μοιραστείς.",
    "Η ευγένεια είναι μια κρυφή υπερδύναμη που ομορφαίνει τα πάντα.",
    "Διάβασε μια σελίδα από το αγαπημένο σου βιβλίο σήμερα!",
    "Τα λάθη είναι απλώς αποδείξεις ότι προσπαθείς.",
    "Η φιλία είναι το πιο όμορφο παιχνίδι στο διάλειμμα.",
    "Πίστεψε στις δυνάμεις σου, μπορείς να καταφέρεις πολλά!",
    "Μια μικρή καλή πράξη σήμερα θα κάνει κάποιον ευτυχισμένο.",
    "Πάρε μια βαθιά ανάσα και χαλάρωσε για λίγα λεπτά.",
    "Η φαντασία σου είναι ένας μαγικός κόσμος χωρίς όρια.",
    "Βοήθησε έναν συμμαθητή σου σήμερα, η ομαδικότητα είναι δύναμη!",
    "Κάθε μικρό βήμα σε φέρνει πιο κοντά στα όνειρά σου.",
    "Η γνώση μεγαλώνει όταν τη μοιράζεσαι με τους φίλους σου.",
    "Να είσαι περήφανος για την προσπάθεια που καταβάλλεις κάθε μέρα.",
    "Ο κόσμος είναι γεμάτος θαύματα, βγες έξω και εξερεύνησέ τον!",
    "Ένα «ευχαριστώ» μπορεί να φτιάξει τη μέρα ενός ανθρώπου.",
    "Η υπομονή είναι το κλειδί για να λύσεις τις πιο δύσκολες ασκήσεις.",
    "Γέλα με την καρδιά σου σήμερα, το γέλιο είναι υγεία!",
    "Η καθαριότητα στο θρανίο σου φέρνει καθαρή σκέψη.",
    "Κάνε μια ζωγραφιά και χάρισέ την σε κάποιον που αγαπάς.",
    "Ο αθλητισμός μας δίνει ενέργεια και μας μαθαίνει να συνεργαζόμαστε.",
    "Άκουσε με προσοχή τι έχουν να σου πουν οι άλλοι.",
    "Σεβάσου τη φύση και τα φυτά γύρω σου, μας δίνουν ζωή.",
    "Η ειλικρίνεια χτίζει τις πιο δυνατές φιλίες.",
    "Κάθε μέρα μαθαίνουμε κάτι καινούργιο, αρκεί να έχουμε ανοιχτά μάτια.",
    "Μην τα παρατάς αν κάτι σε δυσκολέψει, προσπάθησε ξανά!",
    "Το πιο όμορφο ταξίδι γίνεται μέσα από τις σελίδες ενός βιβλίου.",
    "Να είσαι πάντα ο εαυτός σου, γιατί ο εαυτός σου είναι υπέροχος!",
    "Μια καλή κουβέντα μπορεί να σβήσει μια κακή στιγμή.",
    "Μην ξεχνάς να πίνεις νερό και να φροντίζεις το σώμα σου.",
    "Η μουσική μπορεί να σου φτιάξει τη διάθεση σε ένα λεπτό.",
    "Βάλε στόχο να γίνεις σήμερα λίγο καλύτερος από χθες.",
    "Τα ζώα έχουν ανάγκη την αγάπη και την προστασία μας.",
    "Όταν συνεργαζόμαστε, οι δύσκολες εργασίες γίνονται παιχνιδάκι.",
    "Κάθε αστέρι στον ουρανό είναι σαν ένα δικό σου όνειρο.",
    "Χρησιμοποίησε τις «μαγικές λέξεις»: παρακαλώ, ευχαριστώ, συγγνώμη.",
    "Η περιέργεια είναι η αρχή κάθε μεγάλης ανακάλυψης.",
    "Κάνε ένα ήρεμο κλείσιμο στη μέρα σου σκεπτόμενος κάτι καλό.",
    "Η αγκαλιά είναι το καλύτερο φάρμακο για τη στεναχώρια.",
    "Μίλα με όμορφα λόγια στους γονείς και τους δασκάλους σου.",
    "Η δημιουργικότητα κρύβεται σε κάθε σου κατασκευή.",
    "Δοκίμασε να φας ένα φρούτο σήμερα για έξτρα ενέργεια.",
    "Όλοι οι άνθρωποι είναι διαφορετικοί και αυτό κάνει τον κόσμο όμορφο.",
    "Η συγκέντρωση σε βοηθάει να τελειώνεις γρήγορα τα μαθήματά σου.",
    "Παίξε δίκαια σε κάθε παιχνίδι, η αξία είναι στη συμμετοχή.",
    "Μάζεψε τα παιχνίδια σου και κράτα το δωμάτιό σου συμμαζεμένο.",
    "Η ιστορία μας διδάσκει σπουδαία πράγματα για το παρελθόν.",
    "Το διάστημα κρύβει μυστικά που περιμένουν να τα ανακαλύψεις.",
    "Γίνε ο ήρωας της δικής σου ιστορίας σήμερα!",
    "Η θετική σκέψη διώχνει μακριά τα σύννεφα της ανησυχίας.",
    "Μοιράσου τα πράγματά σου, η χαρά διπλασιάζεται.",
    "Κάθε πρωί ξυπνάς με την ευκαιρία να γράψεις μια όμορφη σελίδα.",
    "Η λύση σε ένα πρόβλημα κρύβεται συχνά στην ηρεμία.",
    "Μάθε να συγχωρείς, η κακία βαραίνει την καρδιά.",
    "Φτιάξε ένα πλάνο για τη μέρα σου, θα σε βοηθήσει πολύ.",
    "Οι μεγάλοι επιστήμονες ξεκίνησαν κάνοντας απλές ερωτήσεις.",
    "Η τέχνη μας επιτρέπει να εκφράσουμε όσα νιώθουμε.",
    "Απόλαυσε τον καθαρό αέρα και τον ήλιο στο διάλειμμα.",
    "Να είσαι θαρραλέος, ο φόβος νικιέται με την προσπάθεια.",
    "Ένα καθαρό περιβάλλον ξεκινάει από εμάς τους ίδιους.",
    "Η αγάπη για τη μάθηση είναι ένα δώρο που κρατάει για πάντα.",
    "Σκέψου πριν μιλήσεις, οι λέξεις έχουν μεγάλη δύναμη.",
    "Βρες χρόνο να παίξεις με το κατοικίδιό σου ή να παρατηρήσεις τα πουλιά.",
    "Η γεωγραφία μας δείχνει πόσο τεράστιος και όμορφος είναι ο πλανήτης.",
    "Όταν νιώθεις κουρασμένος, κλείσε τα μάτια και σκέψου μια όμορφη εικόνα.",
    "Η επιτυχία έρχεται σε όσους επιμένουν με χαμόγελο.",
    "Μην κρίνεις ένα βιβλίο από το εξώφυλλό του, εξερεύνησέ το.",
    "Να είσαι πάντα έτοιμος να προσφέρεις μια χείρα βοηθείας.",
    "Τα μαθηματικά είναι σαν γρίφοι που περιμένουν να τους λύσεις.",
    "Κάθε εποχή του χρόνου έχει τη δική της ξεχωριστή ομορφιά.",
    "Η ποίηση κρύβει μουσική μέσα στις λέξεις.",
    "Κάνε μια καλή πράξη στα κρυφά, η εσωτερική χαρά είναι τεράστια.",
    "Να σέβεσαι τους μεγαλύτερους, έχουν πολλά να σου μάθουν.",
    "Η αυτοπεποίθηση χτίζεται μέρα με τη μέρα, με κάθε μικρή σου νίκη.",
    "Γίνε εσύ η αλλαγή που θέλεις να δεις στην τάξη σου.",
    "Το χιούμορ και τα αστεία κάνουν τη ζωή πιο ανάλαφρη.",
    "Μην φοβάσαι το σκοτάδι, τα αστέρια λάμπουν μόνο εκεί.",
    "Κάθε μέρα είναι ένα δώρο, άνοιξέ το με ενθουσιασμό!",
    "Μάθε να ακούς τους φίλους σου όταν έχουν πρόβλημα.",
    "Τα πειράματα στη φυσική μας δείχνουν τη μαγεία του κόσμου.",
    "Η συνέπεια στα μαθήματα σου αφήνει περισσότερο χρόνο για παιχνίδι.",
    "Φρόντισε τα βιβλία σου, είναι οι καλύτεροι οδηγοί σου.",
    "Ένα ζεστό ρόφημα βοηθάει το σώμα να ηρεμήσει το βράδυ.",
    "Η κηπουρική μας μαθαίνει να έχουμε υπομονή με τη φύση.",
    "Κάθε πολιτισμός έχει τις δικές του όμορφες παραδόσεις.",
    "Η ελευθερία συμβαδίζει πάντα με την υπευθυνότητα.",
    "Μην αφήνεις για αύριο αυτό που μπορείς να μάθεις σήμερα.",
    "Οι φίλοι είναι σαν τα αστέρια, δεν τους βλέπεις πάντα αλλά είναι εκεί.",
    "Η συγκέντρωση είναι σαν ένας μυς που γυμνάζεται.",
    "Να είσαι ευγνώμων για το φαγητό που υπάρχει στο τραπέζι σου.",
    "Η τεχνολογία είναι χρήσιμη όταν τη χρησιμοποιούμε με μέτρο.",
    "Κάνε μια βόλτα στη φύση και άκουσε το θρόισμα των φύλλων.",
    "Η ειρήνη ξεκινάει από έναν καλό λόγο στο θρανίο.",
    "Μην συγκρίνεις τον εαυτό σου με άλλους, είσαι ξεχωριστός!",
    "Η προσπάθεια μετράει περισσότερο από τον βαθμό.",
    "Μάθε να μοιράζεσαι τα παιχνίδια σου, είναι πιο διασκεδαστικό.",
    "Το νερό είναι πολύτιμο, μην το σπαταλάς όταν πλένεις τα χέρια σου.",
    "Κάθε μέρα κρύβει μια μικρή περιπέτεια, βρες τη!",
    "Η ευγένεια δεν κοστίζει τίποτα, αλλά αξίζει πάρα πολλά.",
    "Τα όνειρά σου δεν έχουν ηλικία, συνέχισε να ονειρεύεσαι.",
    "Όταν διαβάζεις, γίνεσαι ο εξερευνητής νέων κόσμων.",
    "Η αλήθεια σε κάνει να νιώθεις ελεύθερος και ήσυχος.",
    "Μάθε να χαίρεσαι με την επιτυχία των φίλων σου.",
    "Το σώμα σου χρειάζεται καλό ύπνο για να μεγαλώσει σωστά.",
    "Οι καλές συνήθειες από νωρίς χτίζουν ένα λαμπρό μέλλον.",
    "Μην αφήνεις μια κακή στιγμή να σου χαλάσει όλη τη μέρα.",
    "Η αρχαιολογία μας αποκαλύπτει τα μυστικά των αρχαίων λαών.",
    "Να έχεις πάντα θάρρος να λες τη γνώμη σου με ευγένεια.",
    "Η ομαδική δουλειά κάνει τα θαύματα πραγματικότητα.",
    "Κάθε δέντρο που βλέπεις δίνει οξυγόνο σε εμάς και τα ζώα.",
    "Μάθε να λες «μπράβο» στους άλλους, τους δίνει μεγάλη χαρά.",
    "Η μουσική των πουλιών το πρωί είναι το καλύτερο ξυπνητήρι.",
    "Η υπομονή σε βοηθάει να περιμένεις τη σειρά σου στο παιχνίδι.",
    "Μην ξεχνάς να χαμογελάς στον καθρέφτη σου κάθε πρωί.",
    "Η γνώση είναι ένα κλειδί που ανοίγει όλες τις πόρτες.",
    "Κάθε δυσκολία σε κάνει πιο δυνατό και πιο σοφό.",
    "Σέβασου τους κανόνες του παιχνιδιού για να περάσουν όλοι καλά.",
    "Η αγάπη για την οικογένεια είναι η πιο ζεστή φωλιά.",
    "Κάνε μια ερώτηση στον δάσκαλό σου για κάτι που σε εντυπωσίασε.",
    "Ο καθαρός αέρας καθαρίζει το μυαλό και διώχνει την κούραση.",
    "Η ζωγραφική είναι ο λόγος της ψυχής χωρίς λέξεις.",
    "Μάθε να φροντίζεις τα πράγματά σου για να κρατήσουν καιρό.",
    "Η διαφορετικότητα είναι το χρώμα που ομορφαίνει τη ζωή.",
    "Κάθε καλό παράδειγμα εμπνέει και τους γύρω σου.",
    "Η μελέτη σε βοηθάει να κατανοήσεις πώς λειτουργεί ο κόσμος.",
    "Μην ξεχνάς να λες «καλημέρα» με ένα μεγάλο χαμόγελο.",
    "Η θάλασσα μας ηρεμεί και μας θυμίζει πόσο απέραντος είναι ο κόσμος.",
    "Οι καλοί τρόποι είναι το διαβατήριο για παντού.",
    "Πίστεψε στο θαύμα της προσπάθειας και θα δεις αποτελέσματα.",
    "Κάθε μέρα είναι μια ευκαιρία να γίνεις ο καλύτερος εαυτός σου.",
    "Η φιλία θέλει φροντίδα, όπως ένα όμορφο λουλούδι.",
    "Μην φοβάσαι να ζητήσεις βοήθεια όταν τη χρειάζεσαι.",
    "Η λογοτεχνία μας μαθαίνει να μπαίνουμε στη θέση των άλλων.",
    "Κράτα τις υποσχέσεις σου, έτσι κερδίζεις την εμπιστοσύνη.",
    "Το γέλιο με τους φίλους είναι η καλύτερη ανάμνηση.",
    "Η ανακύκλωση σώζει τον πλανήτη μας από τα σκουπίδια.",
    "Κάθε σωστή απάντηση ξεκίνησε από μια καλή προσπάθεια.",
    "Τα φρούτα σου δίνουν τις απαραίτητες βιταμίνες και υπερδυνάμεις!",
    "Να είσαι περίεργος για τον κόσμο, κρύβει πολλές εκπλήξεις.",
    "Η ηρεμία είναι ο καλύτερος σύμβουλος στις αποφάσεις.",
    "Μάθε να μοιράζεσαι τη χαρά σου, έτσι πολλαπλασιάζεται.",
    "Η ιστορία της επιστήμης είναι γεμάτη από επίμονους ανθρώπους.",
    "Σέβασου τον χώρο των άλλων, όπως θες να σέβονται τον δικό σου.",
    "Η προσφορά χωρίς αντάλλαγμα γεμίζει την καρδιά με φως.",
    "Μην αφήνεις τις αποτυχίες να σου κλέβουν τον ενθουσιασμό.",
    "Κάθε μέρα είναι μια λευκή σελίδα στο ημερολόγιο της ζωής σου.",
    "Η ευγένεια κάνει ακόμα και τις πιο δύσκολες μέρες όμορφες.",
    "Ταξίδεψε με τη φαντασία σου σε όποιο μέρος του κόσμου θες.",
    "Η αγάπη για το διάβασμα είναι ένας θησαυρός που δεν χάνεται.",
    "Να είσαι δίκαιος και ειλικρινής σε ό,τι κι αν κάνεις.",
    "Κάθε μικρή επιτυχία αξίζει να γιορτάζεται με ένα χαμόγελο.",
    "Το σώμα σου είναι το σπίτι σου, φρόντισέ το με καλή διατροφή.",
    "Η ομαδικότητα στο σχολείο δημιουργεί τις καλύτερες παρέες.",
    "Μην ξεχνάς να λες «παρακαλώ» όταν ζητάς κάτι.",
    "Η φύση την άνοιξη είναι γεμάτη χρώματα και αρώματα.",
    "Η γνώση σε κάνει ανεξάρτητο και δυνατό.",
    "Κάθε μάθημα είναι ένα λιθαράκι για το μέλλον σου.",
    "Μάθε να διαχειρίζεσαι τον χρόνο σου σωστά για να προλαβαίνεις τα πάντα.",
    "Η υπομονή φέρνει πάντα τα καλύτερα αποτελέσματα.",
    "Γίνε ένας καλός ακροατής για τους φίλους σου.",
    "Τα αστέρια τη νύχτα μας θυμίζουν πόσο μεγάλο είναι το σύμπαν.",
    "Η καθαρή συνείδηση φέρνει τον πιο γλυκό ύπνο.",
    "Μην σταματάς να προσπαθείς, η εξάσκηση σε κάνει καλύτερο.",
    "Η ευτυχία κρύβεται στα πιο απλά και καθημερινά πράγματα.",
    "Σέβασου τα δικαιώματα των άλλων, όπως και τα δικά σου.",
    "Η δημιουργία μιας χειροτεχνίας σου δίνει μεγάλη ικανοποίηση.",
    "Μάθε να προστατεύεις τα αδύναμα πλάσματα γύρω σου.",
    "Η δύναμη της θέλησης μπορεί να καταφέρει σπουδαία πράγματα.",
    "Κάθε πρωινό ξύπνημα είναι μια νέα ευκαιρία για χαρά.",
    "Η φιλία είναι μια γέφυρα που ενώνει τις καρδιές μας.",
    "Μην αφήνεις τον θυμό να παίρνει αποφάσεις για σένα.",
    "Η μελέτη του παρελθόντος μας βοηθάει να φτιάξουμε ένα καλύτερο μέλλον.",
    "Να είσαι πάντα έτοιμος να μάθεις κάτι καινούργιο.",
    "Η ευγένεια στους λόγους σου δείχνει έναν όμορφο χαρακτήρα.",
    "Απόλαυσε το παιχνίδι στο έπακρο, αλλά πάντα με ασφάλεια.",
    "Η αγάπη για τα ζώα μας κάνει πιο καλούς ανθρώπους.",
    "Κάθε βιβλίο που τελειώνεις είναι ένας ακόμα στόχος που πέτυχες.",
    "Η ειλικρινής συγγνώμη διορθώνει και τα μεγαλύτερα λάθη.",
    "Να είσαι ευγνώμων για τους ανθρώπους που σε αγαπούν.",
    "Η φαντασία είναι το όχημα για να αλλάξεις τον κόσμο προς το καλύτερο.",
    "Κάνε μια βόλτα στο πάρκο και νιώσε τη ζωντάνια της φύσης.",
    "Η σταθερή προσπάθεια νικάει πάντα το πηγαίο ταλέντο.",
    "Κράτα το χαμόγελό σου ζωντανό, είναι μεταδοτικό!",
    "Η σοφία ξεκινάει από την παραδοχή ότι πάντα έχουμε κάτι να μάθουμε.",
    "Μην αφήνεις τις μικρές αναποδιές να σου χαλάνε τη διάθεση.",
    "Η συνεργασία στην τάξη κάνει το μάθημα πιο διασκεδαστικό.",
    "Να είσαι περήφανος για τη μοναδικότητά σου.",
    "Η γνώση είναι το φως που διώχνει το σκοτάδι της άγνοιας.",
    "Κάθε μέρα είναι μια ευκαιρία να προσφέρεις χαρά σε κάποιον.",
    "Η υπομονή και η επιμονή είναι οι καλύτεροι σύμμαχοι της επιτυχίας.",
    "Κλείσε τη μέρα σου με μια θετική σκέψη και κοιμήσου ήρεμα!"
        ]
    });

    // ==========================================
    // 2. DOM CACHE (Κεντρική Μνήμη Στοιχείων)
    // ==========================================
    const DOM = {
        calendarEl: document.getElementById('calendar'),
        container: document.getElementById('calendar-container'),
        monthLabel: document.getElementById('monthLabel'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        calOrig: document.getElementById("calendar-original-location"),
        calWidget: document.getElementById("calendar-widget-wrapper"),
        calBase: null,
        overlay: null,
        tooltip: null
    };

    // ==========================================
    // 3. UTILITIES (Βοηθητικά Εργαλεία)
    // ==========================================
    const Utils = {
        debounce: (func, delay) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), delay);
            };
        },
        
        // Χειρουργικός καθαρισμός τίτλων από HTML Entities & Εισαγωγικά
        // Χειρουργικός καθαρισμός τίτλων από HTML Entities, Εισαγωγικά & Άνω Τελεία
        cleanTitle: (rawStr) => {
            if (!rawStr) return 'Χωρίς τίτλο';
            
            return rawStr
                // 1. Ελληνικά Εισαγωγικά (« ») και τα "σπασμένα" τους unicode
                .replace(/&laquo;|&#171;|\u00C2\u00AB|\u00A4\u00C3/g, '«')
                .replace(/&raquo;|&#187;|\u00C2\u00BB|\u00A5\u00C3/g, '»')
                
                // 2. Αγγλικά "Έξυπνα" Εισαγωγικά (" ")
                .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;|&quot;/g, '"')
                
                // 3. Απόστροφοι και Μονά εισαγωγικά (' ')
                .replace(/&lsquo;|&rsquo;|&#8216;|&#8217;|&#39;/g, "'")
                
                // 4. Ελληνική Άνω Τελεία (·)
                .replace(/&#183;|&middot;/g, '·')
                
                // 5. Μεγάλες και μικρές παύλες
                .replace(/&ndash;|&#8211;/g, '-')
                .replace(/&mdash;|&#8212;/g, '—')
                
                // 6. Λοιπά σύμβολα (Κενά και &)
                .replace(/&amp;/g, '&')
                .replace(/&nbsp;/g, ' ')
                
                // Τέλος, αφαιρούμε κενά στην αρχή και στο τέλος
                .trim();
        },

        getQuote: () => {
            let used = [];
            try { used = JSON.parse(localStorage.getItem('usedQuotes')) || []; } catch(e) {}
            
            // Δυναμικό reset: Μόλις εμφανιστούν όλες οι ερωτήσεις της λίστας σου, 
            // το ιστορικό μηδενίζεται αυτόματα, όσες κι αν είναι αυτές (10, 100 ή 1000+)
            if (used.length >= CONFIG.quotes.length) {
                used = [];
            }
            
            // Μετατροπή σε Set για αναζήτηση με μηδενική καθυστέρηση στη CPU
            const usedSet = new Set(used);
            const available = [];
            
            for (let i = 0; i < CONFIG.quotes.length; i++) {
                if (!usedSet.has(i)) {
                    available.push(i);
                }
            }

            // Ασφάλεια: Αν για οποιοδήποτε λόγο η λίστα available βγει άδεια
            if (available.length === 0) {
                used = [];
                for (let i = 0; i < CONFIG.quotes.length; i++) {
                    available.push(i);
                }
            }
            
            const randomIndex = available[Math.floor(Math.random() * available.length)];
            
            used.push(randomIndex);
            try { localStorage.setItem('usedQuotes', JSON.stringify(used)); } catch(e) {}
            
            return CONFIG.quotes[randomIndex];
        },

        getTodayStr: () => new Date().toISOString().split('T')[0]
    };

    // ==========================================
    // 4. DATA ENGINE (Διαχείριση Feed)
    // ==========================================
    const DataEngine = {
        postsByDate: {},
        
        fetchData: async () => {
            try {
                const response = await fetch(CONFIG.feedUrl);
                const data = await response.json();
                
                if (data.feed?.entry) {
                    data.feed.entry.forEach(post => {
                        const dateStr = post.published.$t.split('T')[0];
                        const linkObj = post.link.find(l => l.rel === 'alternate');
                        
                        if (!DataEngine.postsByDate[dateStr]) DataEngine.postsByDate[dateStr] = [];
                        
                        DataEngine.postsByDate[dateStr].push({
                            title: Utils.cleanTitle(post.title?.$t),
                            url: linkObj ? linkObj.href : '#'
                        });
                    });
                }
            } catch (error) {
                console.error("Ημερολόγιο: Σφάλμα λήψης δεδομένων.", error);
            }
        }
    };

    // ==========================================
    // 5. UI ENGINE (Tooltips & Modals)
    // ==========================================
    const UIEngine = {
        hideTimeout: null,
        currentHoveredFrame: null,

        init: () => {
            // Δημιουργία DOM στοιχείων μόνο μία φορά
            DOM.overlay = document.createElement('div');
            DOM.overlay.id = 'calendar-overlay';
            document.body.appendChild(DOM.overlay);

            DOM.tooltip = document.createElement('div');
            DOM.tooltip.id = 'calendar-tooltip';
            document.body.appendChild(DOM.tooltip);

            // Events
            DOM.overlay.addEventListener('click', UIEngine.closeTooltip);
            DOM.tooltip.addEventListener('mouseenter', () => clearTimeout(UIEngine.hideTimeout));
            DOM.tooltip.addEventListener('mouseleave', () => { if (window.innerWidth > CONFIG.mobileBreakpoint) UIEngine.closeTooltip(); });
        },

        showTooltip: (cellFrame, posts, isModal) => {
            clearTimeout(UIEngine.hideTimeout);
            DOM.tooltip.innerHTML = '';
            
            posts.forEach(p => {
                let a = document.createElement('a');
                a.href = p.url;
                a.className = 'tooltip-title-link';
                a.innerText = p.title;
                DOM.tooltip.appendChild(a);
            });

            DOM.tooltip.style.display = 'block';
            DOM.tooltip.style.visibility = 'hidden'; // Κρυφό για να πάρει διαστάσεις

            if (isModal) {
                // Κινητό / Modal View
                DOM.overlay.style.display = 'block';
                DOM.tooltip.style.cssText = `display: block; visibility: visible; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.9); opacity: 0;`;
                
                // Hardware Accelerated Repaint
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    DOM.overlay.style.opacity = '1';
                    DOM.tooltip.style.opacity = '1';
                    DOM.tooltip.style.transform = 'translate(-50%, -50%) scale(1)';
                }));
            } else {
                // PC / Hover View
                DOM.tooltip.style.cssText = `display: block; visibility: visible; position: absolute; transform: none; opacity: 0;`;
                
                const rect = cellFrame.getBoundingClientRect();
                const topPos = rect.top + window.scrollY - DOM.tooltip.offsetHeight + 10;
                const leftPos = rect.left + window.scrollX + (rect.width / 2) - (DOM.tooltip.offsetWidth / 2);
                
                DOM.tooltip.style.top = `${topPos}px`;
                DOM.tooltip.style.left = `${leftPos}px`;
                
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    DOM.tooltip.style.opacity = '1';
                }));
            }
        },

        closeTooltip: () => {
            DOM.overlay.style.opacity = '0';
            DOM.tooltip.style.opacity = '0';
            setTimeout(() => {
                DOM.overlay.style.display = 'none';
                DOM.tooltip.style.display = 'none';
            }, 300);
        }
    };

    // ==========================================
    // 6. CALENDAR ENGINE (Λογική FullCalendar & Delegation)
    // ==========================================
    const CalendarEngine = {
        calendar: null,

        init: () => {
            if (!DOM.calendarEl) return;
            const todayStr = Utils.getTodayStr();

            CalendarEngine.calendar = new window.FullCalendar.Calendar(DOM.calendarEl, {
                locale: 'el', 
                initialView: 'dayGridMonth',
                headerToolbar: false,
                height: '100%',
                contentHeight: '100%',
                displayEventTime: false,
                events: [], // Τα events τα διαχειριζόμαστε εμείς οπτικά
                
                datesSet: (info) => {
                    if (!DOM.monthLabel) return;
                    const monthName = info.view.currentStart.toLocaleString('el-GR', { month: 'long', year: 'numeric' });
                    DOM.monthLabel.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                },

                // Εδώ πλέον ΜΟΝΟ ΖΩΓΡΑΦΙΖΟΥΜΕ (Δεν βάζουμε event listeners)
               // Εδώ πλέον ΜΟΝΟ ΖΩΓΡΑΦΙΖΟΥΜΕ (Δεν βάζουμε event listeners)
                dayCellDidMount: (info) => {
                    const cellDateStr = info.el.dataset.date; 
                    const frame = info.el.querySelector('.fc-daygrid-day-frame');
                    if (!frame) return;

                    // Βεβαιωνόμαστε ότι το κελί μπορεί να φιλοξενήσει αιωρούμενα στοιχεία
                    frame.style.position = 'relative'; 

                    if (DataEngine.postsByDate[cellDateStr]) {
                        // Ημέρα ΜΕ αναρτήσεις
                        frame.classList.add('has-posts'); // Ενεργοποιεί το CSS σου
                        
                        // Σωστή δημιουργία στοιχείου (χωρίς να χαλάει το ύψος του κελιού)
                        let dot = document.createElement('div');
                        dot.className = 'post-dot';
                        frame.appendChild(dot);

                    } else if (cellDateStr <= todayStr) {
                        // Κενή ημέρα (Σήμερα ή Παρελθόν)
                        let indicator = document.createElement('div');
                        indicator.innerHTML = (cellDateStr < todayStr) ? '💤' : '✨'; 
                        indicator.style.cssText = 'position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); opacity: 0.25; font-size: 20px; pointer-events: none;';
                        frame.appendChild(indicator);
                    }
                }
            });

            CalendarEngine.calendar.render();
            CalendarEngine.setupEvents();
        },

        // Έξυπνο Event Delegation για Ασφάλεια Μνήμης
        setupEvents: () => {
            if (DOM.prevBtn) DOM.prevBtn.addEventListener('click', () => CalendarEngine.calendar.prev());
            if (DOM.nextBtn) DOM.nextBtn.addEventListener('click', () => CalendarEngine.calendar.next());

            if (!DOM.container) return;

            // Λογική Αλληλεπίδρασης (Κλικ ή Hover)
            const handleCellInteraction = (frame, type) => {
                const cell = frame.closest('.fc-daygrid-day');
                if (!cell) return;
                
                const dateStr = cell.dataset.date;
                const todayStr = Utils.getTodayStr();
                const posts = DataEngine.postsByDate[dateStr];

                // Αν η μέρα είναι κενή και ανήκει στο μέλλον, δεν κάνουμε τίποτα
                if (!posts && dateStr > todayStr) return;

                // Δεδομένα (Είτε Αναρτήσεις, είτε Απόφθεγμα)
                let content = posts;
                if (!posts) {
                    if (!frame.dataset.quote) frame.dataset.quote = Utils.getQuote();
                    content = [{ title: frame.dataset.quote, url: 'javascript:void(0);' }];
                }

                if (type === 'click') {
                    if (window.innerWidth <= CONFIG.mobileBreakpoint) {
                        UIEngine.showTooltip(frame, content, true);
                    } else {
                        if (posts && posts.length === 1) window.open(posts[0].url, '_self'); 
                        else UIEngine.showTooltip(frame, content, true);
                    }
                } else if (type === 'hover' && window.innerWidth > CONFIG.mobileBreakpoint) {
                    UIEngine.showTooltip(frame, content, false);
                }
            };

            // 1. Κεντρικός Ακροατής για Κλικς
            DOM.container.addEventListener('click', (e) => {
                const frame = e.target.closest('.fc-daygrid-day-frame');
                if (frame) { e.preventDefault(); handleCellInteraction(frame, 'click'); }
            });

            // 2. Κεντρικός Ακροατής για Hover
            DOM.container.addEventListener('mouseover', (e) => {
                const frame = e.target.closest('.fc-daygrid-day-frame');
                if (frame && frame !== UIEngine.currentHoveredFrame) {
                    UIEngine.currentHoveredFrame = frame;
                    handleCellInteraction(frame, 'hover');
                }
            });

            DOM.container.addEventListener('mouseout', (e) => {
                const frame = e.target.closest('.fc-daygrid-day-frame');
                if (frame && !frame.contains(e.relatedTarget)) {
                    UIEngine.currentHoveredFrame = null;
                    UIEngine.hideTimeout = setTimeout(UIEngine.closeTooltip, CONFIG.tooltipDelay);
                }
            });

            // 3. Swipe Logic
            let startX = 0, startY = 0;
            DOM.container.addEventListener('touchstart', e => {
                startX = e.changedTouches[0].screenX;
                startY = e.changedTouches[0].screenY;
            }, { passive: true });

            DOM.container.addEventListener('touchend', e => {
                const diffX = e.changedTouches[0].screenX - startX;
                const diffY = e.changedTouches[0].screenY - startY;
                if (Math.abs(diffX) > Math.abs(diffY)) {
                    if (diffX < -40) CalendarEngine.calendar.next();
                    if (diffX > 40) CalendarEngine.calendar.prev();
                }
            }, { passive: true });
        }
    };

    // ==========================================
    // 7. LAYOUT MANAGER (Μετακίνηση στα Κινητά)
    // ==========================================
    const LayoutManager = {
        getOrCreateBase: () => {
            if (DOM.calBase) return DOM.calBase;
            let base = document.getElementById("calendar-mobile-base");
            if (!base) {
                base = document.createElement("div");
                base.id = "calendar-mobile-base";
                base.className = "widget";
            }
            DOM.calBase = base;
            return base;
        },

        move: () => {
            if (!DOM.calOrig || !DOM.calWidget) return;
            let parentWidget = DOM.calOrig.closest('.widget');

            if (window.innerWidth <= CONFIG.layoutBreakpoint) {
                let target = document.getElementById("eortologio-mobile-base") || document.getElementById("smarthub-mobile-base") || document.getElementById("HTML13");
                if (target) {
                    const base = LayoutManager.getOrCreateBase();
                    if (base.parentNode !== target.parentNode || base.previousSibling !== target) {
                        target.after(base);
                    }
                    if (DOM.calWidget.parentNode !== base) {
                        base.appendChild(DOM.calWidget);
                        DOM.calWidget.style.margin = "0 auto";
                    }
                }
                if (parentWidget) parentWidget.style.display = "none";
            } else {
                if (DOM.calWidget.parentNode !== DOM.calOrig.parentNode) {
                    DOM.calOrig.parentNode.insertBefore(DOM.calWidget, DOM.calOrig.nextSibling);
                }
                if (DOM.calBase?.parentNode) DOM.calBase.remove();
                if (parentWidget) parentWidget.style.display = "";
            }
        }
    };

    // ==========================================
    // 8. BOOTSTRAP (Εκκίνηση)
    // ==========================================
    const AppController = {
        init: async () => {
            // Δημιουργία DOM στοιχείων (Overlays)
            UIEngine.init();
            
            // Τοποθέτηση στο σωστό σημείο
            LayoutManager.move();
            window.addEventListener("resize", Utils.debounce(LayoutManager.move, 150), { passive: true });
            
            // Φόρτωση δεδομένων & Εκκίνηση Ημερολογίου
            await DataEngine.fetchData();
            CalendarEngine.init();
            
            // Ασφαλής επανέλεγχος Layout (Αντικαθιστά τα τυφλά setTimeout)
            window.addEventListener("load", LayoutManager.move, { once: true });
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", AppController.init);
    } else {
        AppController.init();
    }

})();

(() => {
  "use strict";

  // ==========================================
  // 1. CONFIGURATION & STATIC DATA (PC)
  // ==========================================
  const CONFIG = Object.freeze({
    defaultFact: "Κάθε μέρα είναι μια ευκαιρία να μελετήσουμε το παρελθόν και να χτίσουμε ένα καλύτερο μέλλον.",
    storagePrefix: "daily_mission_pc_", // Ξεχωριστό prefix για να μη συγκρούεται με το mobile!
    animDelay: 50,
    initDelay: 200
  });

  const DATA = Object.freeze({
    // [ΒΑΛΕ ΕΔΩ ΤΗ ΒΑΣΗ ΔΕΔΟΜΕΝΩΝ ΣΟΥ historyFactsPc]
    historyFactsPc: {
      "0-1": "1896: Ο Ρέντγκεν ανακοινώνει την ανακάλυψη των ακτίνων Χ.",
  "0-2": "2 Ιανουαρίου: Το 1959 εκτοξεύεται το Luna 1, το πρώτο διαστημόπλοιο που κατάφερε να ξεφύγει από τη βαρύτητα της Γης.",
  "0-3": "3 Ιανουαρίου: Το 2009 δημιουργείται το πρώτο μπλοκ (Genesis Block) του Bitcoin, ξεκινώντας την εποχή των κρυπτονομισμάτων.",
  "0-4": "4 Ιανουαρίου: Το 1809 γεννιέται ο Λουδοβίκος Μπράιγ, που εφηύρε το σύστημα ανάγνωσης και γραφής για τυφλούς.",
  "0-5": "5 Ιανουαρίου: Το 1933 ξεκινά η κατασκευή της περίφημης γέφυρας Γκόλντεν Γκέιτ (Golden Gate) στο Σαν Φρανσίσκο.",
  "0-6": "1921: Ιδρύεται το Κομμουνιστικό Κόμμα της Ελλάδας.",
  "0-8": "1642: Πεθαίνει ο Γαλιλαίος Γαλιλέι, ο πατέρας της σύγχρονης αστρονομίας.",
  "0-9": "9 Ιανουαρίου: Το 2007 ο Στιβ Τζομπς παρουσιάζει το πρώτο iPhone, αλλάζοντας για πάντα τον κόσμο των κινητών τηλεφώνων.",
  "0-10": "49 π.Χ.: Ο Ιούλιος Καίσαρας διαβαίνει τον Ρουβίκωνα: 'Alea jacta est'.",
  "0-11": "11 Ιανουαρίου: Το 1935 η Αμέλια Έρχαρτ γίνεται η πρώτη γυναίκα που πετάει μόνη της τον Ειρηνικό Ωκεανό, από τη Χαβάη στην Καλιφόρνια.",
  "0-12": "1945: Οι Σύμμαχοι απελευθερώνουν το Άουσβιτς.",
  "0-14": "14 Ιανουαρίου: Το 2005 το διαστημικό σκάφος Χόιχενς (Huygens) προσεδαφίζεται στον Τιτάνα, τον μεγαλύτερο δορυφόρο του Κρόνου.",
  "0-15": "1759: Ανοίγει το Βρετανικό Μουσείο στο Λονδίνο.",
  "0-16": "16 Ιανουαρίου: Το 1605 εκδίδεται στην Ισπανία ο πρώτος τόμος του «Δον Κιχώτη» από τον συγγραφέα Μιγκέλ ντε Θερβάντες.",
  "0-17": "17 Ιανουαρίου: Το 1706 γεννιέται ο Βενιαμίν Φραγκλίνος, σπουδαίος επιστήμονας, εφευρέτης του αλεξικέραυνου.",
  "0-18": "1919: Ξεκινά η Συνδιάσκεψη Ειρήνης στο Παρίσι μετά τον Α' Παγκόσμιο Πόλεμο.",
  "0-19": "19 Ιανουαρίου: Το 1983 η Apple ανακοινώνει τον υπολογιστή Lisa, τον πρώτο εμπορικό υπολογιστή με γραφικό περιβάλλον χρήστη (GUI) και ποντίκι.",
  "0-20": "20 Ιανουαρίου: Το 1892 διεξάγεται ο πρώτος επίσημος αγώνας καλαθοσφαίρισης (μπάσκετ) που επινοήθηκε από τον Τζέιμς Νάισμιθ.",
  "0-22": "1924: Πεθαίνει ο Βλαντιμίρ Λένιν και η Αγία Πετρούπολη μετονομάζεται σε Λένινγκραντ.",
  "0-23": "23 Ιανουαρίου: Το 1849 η Ελίζαμπεθ Μπλάκγουελ γίνεται η πρώτη γυναίκα στις ΗΠΑ που λαμβάνει πτυχίο ιατρικής.",
  "0-24": "24 Ιανουαρίου: Το 1986 το διαστημόπλοιο Βόγιατζερ 2 περνάει για πρώτη φορά κοντά από τον πλανήτη Ουρανό.",
  "0-25": "1822: Η Α' Εθνοσυνέλευση της Επιδαύρου ψηφίζει το πρώτο Σύνταγμα της Ελλάδας.",
  "0-27": "27 Ιανουαρίου: Το 1880 ο Τόμας Έντισον λαμβάνει το δίπλωμα ευρεσιτεχνίας για τον πρώτο πρακτικό ηλεκτρικό λαμπτήρα.",
  "0-28": "1986: Το διαστημικό λεωφορείο Challenger εκρήγνυται 73 δευτερόλεπτα μετά την εκτόξευση.",
  "0-30": "1948: Δολοφονείται ο Μαχάτμα Γκάντι, ο ηγέτης της μη βίας στην Ινδία.",
  "0-31": "31 Ιανουαρίου: Το 1958 οι ΗΠΑ εκτοξεύουν τον Explorer 1, τον πρώτο τους τεχνητό δορυφόρο στο διάστημα.",

    "1-1": "1979: Ο Αγιατολάχ Χομεϊνί επιστρέφει στο Ιράν μετά από 15 χρόνια εξορίας.",
  "1-2": "2 Φεβρουαρίου: Το 1925 ένα έλκηθρο με σκυλιά και αρχηγό τον σκύλο Μπάλτο, φτάνει στην παγωμένη Αλάσκα μεταφέροντας σωτήριο φάρμακο.",
  "1-3": "3 Φεβρουαρίου: Το 1966 το σοβιετικό σκάφος Luna 9 πραγματοποιεί την πρώτη ομαλή προσελήνωση και στέλνει φωτογραφίες.",
  "1-4": "1945: Ξεκινά η Διάσκεψη της Γιάλτας μεταξύ Τσόρτσιλ, Ρούσβελτ και Στάλιν.",
  "1-5": "5 Φεβρουαρίου: Το 1971 οι αστροναύτες του Apollo 14 περπατούν στη Σελήνη.",
  "1-6": "1952: Η Ελισάβετ Β' γίνεται Βασίλισσα της Μεγάλης Βρετανίας.",
  "1-7": "7 Φεβρουαρίου: Το 1984 οι αστροναύτες Μπρους ΜακΚάντλες και Ρόμπερτ Στιούαρτ κάνουν τον πρώτο διαστημικό περίπατο χωρίς καλώδιο ασφαλείας.",
  "1-8": "8 Φεβρουαρίου: Το 1833 ο βασιλιάς Όθωνας φτάνει στο Ναύπλιο, την πρώτη πρωτεύουσα του νεότερου Ελληνικού Κράτους.",
  "1-9": "1942: Ο Ελληνικός Στρατός νικά τους Ιταλούς στην Πίνδο.",
  "1-10": "10 Φεβρουαρίου: Το 1996 ο υπερυπολογιστής Deep Blue της IBM κερδίζει για πρώτη φορά σε παρτίδα σκακιού τον παγκόσμιο πρωταθλητή Γκάρι Κασπάροφ.",
  "1-11": "11 Φεβρουαρίου: Το 1847 γεννιέται ο Τόμας Έντισον, ένας από τους μεγαλύτερους εφευρέτες που άλλαξαν τον κόσμο μας.",
  "1-12": "1809: Γεννιέται ο Κάρολος Δαρβίνος, θεμελιωτής της θεωρίας της εξέλιξης.",
  "1-14": "14 Φεβρουαρίου: Το 1946 παρουσιάζεται ο ENIAC, ο πρώτος ηλεκτρονικός υπολογιστής γενικής χρήσης, που καταλάμβανε ένα ολόκληρο δωμάτιο.",
  "1-15": "1564: Γεννιέται ο Γαλιλαίος Γαλιλέι στην Πίζα.",
  "1-18": "18 Φεβρουαρίου: Το 1930 ο νεαρός αστρονόμος Κλάιντ Τόμπο ανακαλύπτει τον Πλούτωνα, στις άκρες του ηλιακού μας συστήματος.",
  "1-19": "1473: Γεννιέται ο Νικόλαος Κοπέρνικος, που έθεσε τον Ήλιο στο κέντρο του σύμπαντος.",
  "1-22": "1732: Γεννιέται ο Τζορτζ Ουάσινγκτον, ο πρώτος πρόεδρος των ΗΠΑ.",
  "1-23": "23 Φεβρουαρίου: Το 1455 ο Ιωάννης Γουτεμβέργιος τυπώνει το πρώτο βιβλίο με κινητά γράμματα, τη Βίβλο, αλλάζοντας την ιστορία της γνώσης.",
  "1-25": "1921: Η Τιφλίδα καταλαμβάνεται από τον Κόκκινο Στρατό.",
  "1-27": "27 Φεβρουαρίου: Το 1932 ο φυσικός Τζέιμς Τσάντγουικ ανακαλύπτει το νετρόνιο, ένα βασικό σωματίδιο του ατόμου.",
  "1-28": "1922: Η Μεγάλη Βρετανία αναγνωρίζει την ανεξαρτησία της Αιγύπτου.",

    "2-1": "1919: Ιδρύεται το Μπάουχαους, η σχολή που άλλαξε τη μοντέρνα αρχιτεκτονική.",
  "2-2": "2 Μαρτίου: Το 1969 πραγματοποιεί την παρθενική του πτήση το υπερηχητικό επιβατικό αεροπλάνο Κονκόρντ (Concorde).",
  "2-3": "1918: Υπογράφεται η συνθήκη του Μπρεστ-Λιτόφσκ.",
  "2-4": "4 Μαρτίου: Το 1877 ο Εμίλ Μπερλίνερ εφευρίσκει το μικρόφωνο.",
  "2-5": "5 Μαρτίου: Το 1616 η Καθολική Εκκλησία απαγορεύει το βιβλίο του Κοπέρνικου που υποστήριζε σωστά ότι η Γη γυρίζει γύρω από τον Ήλιο.",
  "2-6": "1957: Η Γκάνα γίνεται η πρώτη χώρα της υποσαχάριας Αφρικής που αποκτά ανεξαρτησία.",
  "2-7": "7 Μαρτίου: Το 1876 ο Αλεξάντερ Γκράχαμ Μπελ λαμβάνει το δίπλωμα ευρεσιτεχνίας για το τηλέφωνο.",
  "2-9": "9 Μαρτίου: Το 1934 γεννιέται ο Γιούρι Γκαγκάριν, ο πρώτος άνθρωπος που ταξίδεψε στο διάστημα.",
  "2-10": "10 Μαρτίου: Το 1876 ο Αλεξάντερ Γκράχαμ Μπελ κάνει την πρώτη επιτυχημένη τηλεφωνική κλήση στον βοηθό του.",
  "2-12": "1918: Η Μόσχα γίνεται ξανά πρωτεύουσα της Ρωσίας.",
  "2-13": "13 Μαρτίου: Το 1781 ο αστρονόμος Ουίλιαμ Χέρσελ ανακαλύπτει τον πλανήτη Ουρανό.",
  "2-14": "14 Μαρτίου: Το 1879 γεννιέται ο Άλμπερτ Αϊνστάιν, ο ιδιοφυής επιστήμονας που άλλαξε τον τρόπο που κατανοούμε το σύμπαν.",
  "2-15": "15 Μαρτίου: Το 1985 καταχωρείται το πρώτο domain name (όνομα ιστοσελίδας) στο διαδίκτυο (symbolics.com).",
  "2-17": "17 Μαρτίου: Το 1958 εκτοξεύεται ο Vanguard 1, ο οποίος είναι σήμερα ο παλαιότερος τεχνητός δορυφόρος που συνεχίζει να βρίσκεται στο διάστημα.",
  "2-18": "1962: Τερματίζεται ο πόλεμος της Αλγερίας με τη Γαλλία.",
  "2-19": "19 Μαρτίου: Το 1895 οι αδερφοί Λιμιέρ καταγράφουν το πρώτο τους κινηματογραφικό φιλμ.",
  "2-20": "20 Μαρτίου: Το 1727 φεύγει από τη ζωή ο Ισαάκ Νεύτων, ο σπουδαίος φυσικός που διατύπωσε τον νόμο της παγκόσμιας έλξης (βαρύτητα).",
  "2-21": "1960: Σφαγή στη Σάρπβιλ της Νότιας Αφρικής κατά του απαρτχάιντ.",
  "2-22": "22 Μαρτίου: Το 1895 οι αδελφοί Λιμιέρ προβάλλουν την πρώτη κινηματογραφική ταινία σε μια μικρή ιδιωτική προβολή στο Παρίσι.",
  "2-23": "23 Μαρτίου: Το 1821 απελευθερώνεται η Καλαμάτα από τους Έλληνες αγωνιστές, αποτελώντας την πρώτη ελεύθερη πόλη της Επανάστασης.",
  "2-24": "24 Μαρτίου: Το 1882 ο Ρόμπερτ Κοχ ανακοινώνει την ανακάλυψη του βακτηρίου που προκαλεί τη φυματίωση.",
  "2-25": "1821: Ο Παλαιών Πατρών Γερμανός υψώνει το λάβαρο της Επανάστασης στην Αγία Λαύρα.",
  "2-26": "26 Μαρτίου: Το 1953 ο Τζόνας Σαλκ ανακοινώνει την επιτυχή δοκιμή του εμβολίου κατά της πολιομυελίτιδας.",
  "2-28": "1922: Η Αίγυπτος ανεξαρτητοποιείται από τη Μεγάλη Βρετανία.",
  "2-29": "29 Μαρτίου: Το 1974 ντόπιοι αγρότες στην Κίνα ανακαλύπτουν τυχαία σκάβοντας τον περίφημο «Πήλινο Στρατό» με χιλιάδες αγάλματα πολεμιστών.",
  "2-31": "31 Μαρτίου: Το 1889 εγκαινιάζεται στο Παρίσι ο Πύργος του Άιφελ, το ψηλότερο κτίριο του κόσμου για εκείνη την εποχή.",

   "3-1": "1 Απριλίου: Το 1976 ιδρύεται η εταιρεία Apple Computer από τους Στιβ Τζομπς και Στιβ Βόζνιακ.",
"3-2": "1982: Ξεκινά ο Πόλεμος των Φώκλαντ μεταξύ Αργεντινής και Βρετανίας.",
"3-3": "3 Απριλίου: Το 1973 ο Μάρτιν Κούπερ της Motorola πραγματοποιεί την πρώτη κλήση από κινητό τηλέφωνο.",
"3-4": "1949: Ιδρύεται το ΝΑΤΟ στην Ουάσινγκτον.",
"3-5": "5 Απριλίου: Το 1904 γεννιέται ο Ρόμπερτ Οπενχάιμερ, ο θεωρητικός φυσικός που ηγήθηκε του Προγράμματος Μανχάταν.",
"3-6": "1896: Οι πρώτοι σύγχρονοι Ολυμπιακοί Αγώνες στην Αθήνα.",
"3-7": "7 Απριλίου: Το 1948 ιδρύεται ο Παγκόσμιος Οργανισμός Υγείας, με σκοπό να φροντίζει για την υγεία των ανθρώπων σε όλο τον πλανήτη.",
"3-8": "8 Απριλίου: Το 1911 ανακαλύπτεται η υπεραγωγιμότητα από τον Ολλανδό φυσικό Χάικε Κάμερλινγκ Όνες.",
"3-9": "1940: Η Γερμανία εισβάλλει στη Νορβηγία και τη Δανία.",
"3-10": "10 Απριλίου: Το 2019 δημοσιεύεται η πρώτη φωτογραφία μιας μαύρης τρύπας στην ιστορία της ανθρωπότητας.",
"3-11": "11 Απριλίου: Το 1970 εκτοξεύεται το διαστημόπλοιο Apollo 13. Αν και υπέστη βλάβη, το πλήρωμα επέστρεψε στη Γη με ασφάλεια.",
"3-12": "1961: Ο Γιούρι Γκαγκάριν ολοκληρώνει μια πλήρη τροχιά γύρω από τη Γη.",
"3-13": "13 Απριλίου: Το 1970 ακούγεται η περίφημη φράση «Χιούστον, έχουμε πρόβλημα» από τους αστροναύτες του Apollo 13.",
"3-14": "14 Απριλίου: Το 1828 κυκλοφορεί το πρώτο αμερικανικό λεξικό από τον Νόα Γουέμπστερ, οργανώνοντας την αγγλική γλώσσα.",
"3-15": "1912: Βυθίζεται ο Τιτανικός στο παρθενικό του ταξίδι.",
"3-16": "16 Απριλίου: Το 1943 ο Ελβετός χημικός Άλμπερτ Χόφμαν ανακαλύπτει τυχαία τις ιδιότητες του LSD.",
"3-17": "17 Απριλίου: Το 1964 παρουσιάζεται για πρώτη φορά σε μεγάλη έκθεση το θρυλικό αυτοκίνητο Ford Mustang.",
"3-18": "1906: Μεγάλος σεισμός καταστρέφει το Σαν Φρανσίσκο.",
"3-19": "19 Απριλίου: Το 1971 εκτοξεύεται ο Salyut 1, ο πρώτος διαστημικός σταθμός στην ιστορία.",
"3-21": "21 Απριλίου: Το 1989 λανσάρεται το Game Boy από τη Nintendo, φέρνοντας επανάσταση στα φορητά βιντεοπαιχνίδια.",
"3-22": "22 Απριλίου: Το 1500 ο Πορτογάλος εξερευνητής Πέδρο Άλβαρες Καμπράλ φτάνει στις ακτές της Νότιας Αμερικής και ανακαλύπτει τη Βραζιλία.",
"3-24": "24 Απριλίου: Το 1990 εκτοξεύεται στο διάστημα το διαστημικό τηλεσκόπιο Hubble (Χαμπλ).",
"3-25": "25 Απριλίου: Το 1859 ξεκινά η κατασκευή της Διώρυγας του Σουέζ, ενός τεράστιου έργου που ένωσε τη Μεσόγειο με την Ερυθρά Θάλασσα.",
"3-27": "1909: Ιδρύεται η πόλη του Τελ Αβίβ.",
"3-28": "28 Απριλίου: Το 2001 ο Ντένις Τίτο γίνεται ο πρώτος πολίτης που ταξιδεύει στο διάστημα ως «τουρίστας».",

   // ΜΑΪΟΣ
"4-1": "1 Μαΐου: Το 1886 οργανώνεται στο Σικάγο μια τεράστια απεργία εργατών που διεκδικούσαν να δουλεύουν οκτώ ώρες την ημέρα.",
"4-2": "2 Μαΐου: Το 1519 πεθαίνει ο Λεονάρντο ντα Βίντσι, η απόλυτη ιδιοφυΐα της Αναγέννησης.",
"4-3": "3 Μαΐου: Το 1937 η Αμερικανίδα συγγραφέας Μάργκαρετ Μίτσελ κερδίζει το βραβείο Πούλιτζερ για το διάσημο βιβλίο της «Όσα Παίρνει ο Άνεμος».",
"4-5": "1821: Πεθαίνει ο Ναπολέων Βοναπάρτης στο νησί της Αγίας Ελένης.",
"4-6": "6 Μαΐου: Το 1994 εγκαινιάζεται η Σήραγγα της Μάγχης, ενώνοντας υποθαλάσσια τη Γαλλία με τη Μεγάλη Βρετανία.",
"4-8": "8 Μαΐου: Το 1886 ο Τζον Πέμπερτον, ένας φαρμακοποιός στην Ατλάντα, δημιουργεί τη μυστική συνταγή για την Coca-Cola.",
"4-10": "10 Μαΐου: Το 1997 ο υπολογιστής Deep Blue της IBM νικά τον παγκόσμιο πρωταθλητή στο σκάκι Γκάρι Κασπάροφ.",
"4-11": "330: Ο Μέγας Κωνσταντίνος εγκαινιάζει την Κωνσταντινούπολη.",
"4-12": "12 Μαΐου: Το 1928 ο Μίκυ Μάους εμφανίζεται για πρώτη φορά σε δοκιμαστική προβολή της βωβής ταινίας κινουμένων σχεδίων «Plane Crazy».",
"4-13": "13 Μαΐου: Το 1857 γεννιέται ο Ρόναλντ Ρος, που βραβεύτηκε με Νόμπελ για την ανακάλυψη της μετάδοσης της ελονοσίας από τα κουνούπια.",
"4-14": "1920: Ο Ελληνικός Στρατός απελευθερώνει την Αλεξανδρούπολη (Δεδέαγατς).",
"4-15": "15 Μαΐου: Το 1618 ο σπουδαίος μαθηματικός Γιοχάνες Κέπλερ διατυπώνει τον τρίτο νόμο του για το πώς κινούνται οι πλανήτες γύρω από τον Ήλιο.",
"4-16": "16 Μαΐου: Το 1960 ο Θίοντορ Μάιμαν παρουσιάζει το πρώτο λειτουργικό λέιζερ (LASER).",
"4-18": "18 Μαΐου: Το 1969 εκτοξεύεται το Apollo 10, κάνοντας την τελευταία επιτυχημένη πρόβα πριν πατήσει ο άνθρωπος στο φεγγάρι.",
"4-19": "1919: Ο Μουσταφά Κεμάλ αποβιβάζεται στη Σαμψούντα, αρχή του εθνικού κινήματος.",
"4-20": "20 Μαΐου: Το 1873 κατοχυρώνεται επίσημα η κατασκευή των μπλου τζιν (blue jeans), του πιο διάσημου ρούχου στον κόσμο.",
"4-21": "21 Μαΐου: Το 1927 ο Τσαρλς Λίντμπεργκ ολοκληρώνει την πρώτη υπερατλαντική πτήση χωρίς στάση.",
"4-23": "1945: Οι Σύμμαχοι απελευθερώνουν το στρατόπεδο του Νταχάου.",
"4-24": "24 Μαΐου: Το 1844 ο Σάμιουελ Μορς στέλνει επιτυχημένα το πρώτο τηλεγράφημα, ανοίγοντας τον δρόμο για τις σύγχρονες επικοινωνίες.",
"4-25": "25 Μαΐου: Το 1977 κάνει πρεμιέρα στους κινηματογράφους η πρώτη ταινία «Ο Πόλεμος των Άστρων» (Star Wars).",
"4-27": "27 Μαΐου: Το 1931 πραγματοποιείται η πρώτη πτήση στο στρατόσφαιρο (στα 15.781 μέτρα) από τον Ογκίστ Πικάρ.",
"4-28": "28 Μαΐου: Το 1932 οργανώνονται δημοτικές εκλογές στην Ελλάδα όπου ψηφίζουν για πρώτη φορά, δειλά δειλά, κάποιες γυναίκες.",
"4-29": "1453: Άλωση της Κωνσταντινούπολης: Το τέλος του Βυζαντίου.",

    "5-1": "1 Ιουνίου: Το 1980 ξεκινά η λειτουργία του CNN, του πρώτου τηλεοπτικού δικτύου με 24ωρη μετάδοση ειδήσεων.",
"5-3": "3 Ιουνίου: Το 1965 ο Έντουαρντ Χουάιτ γίνεται ο πρώτος Αμερικανός αστροναύτης που πραγματοποιεί διαστημικό περίπατο.",
"5-4": "1989: Η εξέγερση της Πλατείας Τιεν Αν Μεν στην Κίνα.",
"5-5": "5 Ιουνίου: Το 1977 πωλείται ο Apple II, ο πρώτος προσωπικός υπολογιστής που γνώρισε μαζική επιτυχία στα σπίτια.",
"5-6": "6 Ιουνίου: Το 1984 κυκλοφορεί το Tetris, το εμβληματικό βιντεοπαιχνίδι παζλ που κατέκτησε όλο τον κόσμο.",
"5-7": "7 Ιουνίου: Το 1494 υπογράφεται η Συνθήκη της Τορδεσίγιας, χωρίζοντας τον χάρτη του Νέου Κόσμου ανάμεσα σε Ισπανία και Πορτογαλία.",
"5-8": "8 Ιουνίου: Το 1912 ιδρύεται το στούντιο της Universal Pictures, δημιουργώντας εκατοντάδες κλασικές ταινίες του κινηματογράφου.",
"5-9": "9 Ιουνίου: Το 1821 πεθαίνει ο Αδαμάντιος Κοραής, κορυφαίος διαφωτιστής, φιλόλογος και δάσκαλος του Γένους.",
"5-10": "1943: Η Μάχη του Κουρσκ, η μεγαλύτερη αρματομαχία στην ιστορία.",
"5-11": "11 Ιουνίου: Το 1910 γεννιέται ο Ζακ-Υβ Κουστώ, Γάλλος ωκεανογράφος, εφευρέτης και πρωτοπόρος εξερευνητής του βυθού.",
"5-12": "1994: Ο Νέλσον Μαντέλα αναλαμβάνει πρόεδρος της Νότιας Αφρικής.",
"5-13": "13 Ιουνίου: Το 1983 το διαστημικό σκάφος Pioneer 10 γίνεται το πρώτο ανθρώπινο κατασκεύασμα που βγαίνει από το ηλιακό μας σύστημα.",
"5-14": "14 Ιουνίου: Το 1951 παραδίδεται ο UNIVAC I, ο πρώτος εμπορικός υπολογιστής στον κόσμο, ικανός να λύνει πολύπλοκες πράξεις γρήγορα.",
"5-15": "15 Ιουνίου: Το 1752 ο Βενιαμίν Φραγκλίνος πετάει έναν χαρταετό σε καταιγίδα και αποδεικνύει ότι οι αστραπές είναι ηλεκτρισμός.",
"5-16": "1963: Η πρώτη γυναίκα στο διάστημα, Βαλεντίνα Τερεσκόβα.",
"5-18": "18 Ιουνίου: Το 1815 διεξάγεται η θρυλική Μάχη του Βατερλό, όπου ο στρατός του Ναπολέοντα ηττάται οριστικά.",
"5-19": "19 Ιουνίου: Το 1623 γεννιέται ο Μπλεζ Πασκάλ, σπουδαίος μαθηματικός, φυσικός και φιλόσοφος.",
"5-20": "1966: Το 1996 εκτοξεύεται το διαστημικό λεωφορείο Columbia, μεταφέροντας στο διάστημα έναν ειδικό θάλαμο για τη μελέτη της συμπεριφοράς των φυτών και της φωτιάς σε συνθήκες έλλειψης βαρύτητας.",
"5-21": "21 Ιουνίου: Το 2004 το SpaceShipOne γίνεται το πρώτο διαστημόπλοιο που κατασκευάστηκε από ιδιώτες και καταφέρνει να φτάσει στο διάστημα.",
"5-22": "22 Ιουνίου: Το 1633 ο Γαλιλαίος αναγκάζεται από την Ιερά Εξέταση να απαρνηθεί τη θεωρία του ότι η Γη γυρίζει γύρω από τον Ήλιο.",
"5-23": "1913: Μάχη του Κιλκίς, καθοριστική νίκη για την απελευθέρωση της Μακεδονίας.",
"5-25": "25 Ιουνίου: Το 1903 γεννιέται ο Τζορτζ Όργουελ, συγγραφέας του εμβληματικού δυστοπικού μυθιστορήματος «1984».",
"5-27": "27 Ιουνίου: Το 1967 εγκαθίσταται το πρώτο ΑΤΜ (Αυτόματη Ταμειολογική Μηχανή) στο Λονδίνο.",
"5-28": "1914: Δολοφονία του Αρχιδούκα Φερδινάνδου στο Σεράγεβο, αιτία του Α' ΠΠ.",
"5-30": "30 Ιουνίου: Το 1908 πέφτει ένας τεράστιος μετεωρίτης στην περιοχή Τουνγκούσκα της Σιβηρίας, καταστρέφοντας εκατομμύρια δέντρα.",

    "6-1": "1 Ιουλίου: Το 1979 κυκλοφορεί το Walkman από τη Sony, αλλάζοντας δραστικά τον τρόπο που ακούμε μουσική εν κινήσει.",
"6-2": "2 Ιουλίου: Το 1900 πραγματοποιεί την πρώτη του επιτυχημένη πτήση το αερόπλοιο Ζέπελιν πάνω από μια λίμνη της Γερμανίας.",
"6-3": "3 Ιουλίου: Το 1886 ο Καρλ Μπεντς οδηγεί το πρώτο αυτοκίνητο με κινητήρα εσωτερικής καύσης.",
"6-4": "1776: Διακήρυξη Ανεξαρτησίας των ΗΠΑ.",
"6-5": "5 Ιουλίου: Το 1687 ο Ισαάκ Νεύτων εκδίδει το βιβλίο «Principia», ίσως το πιο σημαντικό βιβλίο στην ιστορία της φυσικής.",
"6-6": "6 Ιουλίου: Το 1885 ο Λουί Παστέρ δοκιμάζει με επιτυχία το πρώτο εμβόλιο κατά της λύσσας σε έναν 9χρονο που είχε δαγκωθεί από σκύλο.",
"6-7": "7 Ιουλίου: Το 1928 κυκλοφορεί για πρώτη φορά στα ράφια των καταστημάτων ψωμί κομμένο σε φέτες, ενθουσιάζοντας τους καταναλωτές.",
"6-8": "8 Ιουλίου: Το 1497 ο γενναίος θαλασσοπόρος Βάσκο ντα Γκάμα ξεκινά με τα πλοία του για να βρει θαλάσσιο δρόμο προς την Ινδία.",
"6-9": "9 Ιουλίου: Το 1935 συστήνεται ο μηχανισμός του ραντάρ, μια τεχνολογία ζωτικής σημασίας για την αεροπλοΐα.",
"6-10": "10 Ιουλίου: Το 1856 γεννιέται ο Νίκολα Τέσλα, ο πρωτοπόρος της επιστήμης του εναλλασσόμενου ρεύματος και των ασύρματων επικοινωνιών.",
"6-12": "12 Ιουλίου: Το 2022 η NASA δίνει στη δημοσιότητα τις πρώτες εκπληκτικές έγχρωμες εικόνες από το διαστημικό τηλεσκόπιο James Webb.",
"6-14": "1789: Πτώση της Βαστίλης: Γαλλική Επανάσταση.",
"6-16": "16 Ιουλίου: Το 1969 εκτοξεύεται ο πύραυλος Saturn V, μεταφέροντας το Apollo 11 και τους πρώτους ανθρώπους προς τη Σελήνη.",
"6-17": "17 Ιουλίου: Το 1955 ανοίγει τις πύλες του το πιο διάσημο θεματικό πάρκο στον κόσμο, η Disneyland στην Καλιφόρνια.",
"6-18": "18 Ιουλίου: Το 1976 η 14χρονη Νάντια Κομανέτσι γίνεται η πρώτη αθλήτρια που παίρνει το απόλυτο «10» στη γυμναστική στους Ολυμπιακούς Αγώνες.",
"6-20": "1969: Ο Νιλ Άρμστρονγκ πατά στη Σελήνη.",
"6-21": "21 Ιουλίου: Το 356 π.Χ. γεννιέται ο Μέγας Αλέξανδρος στην Πέλλα της Μακεδονίας, ο βασιλιάς που θα δημιουργούσε μια τεράστια αυτοκρατορία.",
"6-26": "26 Ιουλίου: Το 1989 απαγγέλλεται η πρώτη νομική κατηγορία παγκοσμίως για εξάπλωση ιού σε ηλεκτρονικούς υπολογιστές.",
"6-29": "29 Ιουλίου: Το 1836 εγκαινιάζεται η Αψίδα του Θριάμβου στο Παρίσι, ένα από τα πιο διάσημα μνημεία της Ευρώπης.",
"6-30": "30 Ιουλίου: Το 2020 εκτοξεύεται το ρόβερ Perseverance της NASA με προορισμό τον πλανήτη Άρη.",
"6-31": "31 Ιουλίου: Το 1971 οι αστροναύτες του Apollo 15 οδηγούν για πρώτη φορά το ειδικό τζιπάκι (Rover) στην επιφάνεια της Σελήνης.",

"7-1": "1 Αυγούστου: Το 1981 ξεκινά η εκπομπή του MTV, φέρνοντας επανάσταση στα μουσικά βίντεο κλιπ (το πρώτο βίντεο ήταν το «Video Killed the Radio Star»).",
"7-3": "3 Αυγούστου: Το 1492 ο Χριστόφορος Κολόμβος φεύγει από την Ισπανία με τρία καράβια (Νίνια, Πίντα, Σάντα Μαρία) για να εξερευνήσει τον κόσμο.",
"7-4": "4 Αυγούστου: Το 1901 γεννιέται ο Λούις Άρμστρονγκ, ένας από τους θρύλους της τζαζ μουσικής.",
"7-5": "5 Αυγούστου: Το 2012 το ρομποτικό όχημα Curiosity της NASA προσεδαφίζεται επιτυχώς στον Άρη για να ψάξει ίχνη ζωής.",
"7-6": "1945: Ρίψη ατομικής βόμβας στη Χιροσίμα.",
"7-9": "9 Αυγούστου: Το 1928 γεννιέται ο Μάρβιν Μίνσκυ, πρωτοπόρος επιστήμονας στον τομέα της Τεχνητής Νοημοσύνης.",
"7-12": "12 Αυγούστου: Το 1990 ανακαλύπτεται από παλαιοντολόγους ο πιο πλήρης και εντυπωσιακός σκελετός δεινοσαύρου Τυραννόσαυρου Ρεξ.",
"7-14": "14 Αυγούστου: Το 1893 η Γαλλία γίνεται η πρώτη χώρα που εκδίδει πινακίδες κυκλοφορίας για τα αυτοκίνητα.",
"7-15": "1914: Η Αυστρία κηρύσσει τον πόλεμο στη Σερβία.",
"7-17": "17 Αυγούστου: Το 1970 εκτοξεύεται η σοβιετική αποστολή Venera 7, το πρώτο σκάφος που προσεδαφίστηκε ποτέ στον πλανήτη Αφροδίτη.",
"7-20": "20 Αυγούστου: Το 1977 εκτοξεύεται το διαστημόπλοιο Voyager 2 για να μελετήσει τους εξωτερικούς πλανήτες του ηλιακού συστήματος.",
"7-21": "21 Αυγούστου: Το 1911 κλέβεται από το Λούβρο ο πιο διάσημος πίνακας ζωγραφικής, η «Μόνα Λίζα» (αλλά βρέθηκε δύο χρόνια μετά).",
"7-22": "22 Αυγούστου: Το 1864 υπογράφεται η πρώτη Συνθήκη της Γενεύης για την προστασία των τραυματιών πολέμου και ιδρύεται ο Ερυθρός Σταυρός.",
"7-23": "23 Αυγούστου: Το 1991 δημιουργείται ο πρώτος ιστότοπος (website) στο World Wide Web, στους υπολογιστές του CERN.",
"7-24": "1974: Πτώση της Χούντας στην Ελλάδα.",
"7-26": "26 Αυγούστου: Το 1743 γεννιέται ο Αντουάν Λαβουαζιέ, ο πατέρας της σύγχρονης χημείας.",
"7-27": "27 Αυγούστου: Το 1883 εκρήγνυται το ηφαίστειο Κρακατόα, προκαλώντας τον πιο δυνατό ήχο που άκουσε ποτέ η ανθρωπότητα.",
"7-28": "28 Αυγούστου: Το 1963 ο Μάρτιν Λούθερ Κινγκ βγάζει τον ιστορικό λόγο «Έχω ένα όνειρο» για την ισότητα όλων των ανθρώπων.",
"7-29": "29 Αυγούστου: Το 1885 ο μηχανικός Γκότλιμπ Ντάιμλερ κατασκευάζει και κατοχυρώνει την πρώτη μοτοσικλέτα στον κόσμο.",
"7-31": "31 Αυγούστου: Το 1897 κατοχυρώνεται η πατέντα για τον κινηματογραφικό προβολέα (Κινητοσκόπιο) του Τόμας Έντισον.",

 
    "8-1": "1 Σεπτεμβρίου: Το 1985 εντοπίζεται το ναυάγιο του Τιτανικού από την ωκεανογραφική ομάδα του Ρόμπερτ Μπάλαρντ.",
"8-2": "2 Σεπτεμβρίου: Το 1666 ξεσπά η Μεγάλη Πυρκαγιά του Λονδίνου, η οποία ξεκίνησε από έναν φούρνο και κατέστρεψε την ξύλινη πόλη.",
"8-3": "3 Σεπτεμβρίου: Το 1976 το μη επανδρωμένο σκάφος Viking 2 της NASA προσεδαφίζεται επιτυχώς στον Άρη.",
"8-5": "5 Σεπτεμβρίου: Το 1977 εκτοξεύεται το διαστημόπλοιο Voyager 1 που σήμερα ταξιδεύει στο σκοτεινό διάστημα, έξω από το ηλιακό μας σύστημα.",
"8-6": "6 Σεπτεμβρίου: Το 1844 γεννιέται ο Χόρχε Λουίς Μπόρχες, από τους σπουδαιότερους συγγραφείς του 20ού αιώνα.",
"8-7": "7 Σεπτεμβρίου: Το 1822 η Βραζιλία ανακηρύσσει την ανεξαρτησία της από την Πορτογαλία, χάρη στον αυτοκράτορα Πέτρο Α'.",
"8-9": "9 Σεπτεμβρίου: Το 1947 καταγράφεται το πρώτο bug (σφάλμα) υπολογιστή, όταν ένας πραγματικός σκόρος βρέθηκε στα κυκλώματα του υπολογιστή Mark II.",
"8-12": "12 Σεπτεμβρίου: Το 1958 κατασκευάζεται το πρώτο ολοκληρωμένο κύκλωμα (μικροτσίπ) από τον μηχανικό Τζακ Κίλμπι.",
"8-13": "13 Σεπτεμβρίου: Το 1985 κυκλοφορεί στην Ιαπωνία το θρυλικό βιντεοπαιχνίδι «Super Mario Bros.», κάνοντας τον Μάριο διάσημο.",
"8-14": "1922: Η Καταστροφή της Σμύρνης σηματοδοτεί την προσφυγιά για χιλιάδες οικογένειες στη Μακεδονία.",
"8-17": "17 Σεπτεμβρίου: Το 1787 υπογράφεται το Σύνταγμα των Ηνωμένων Πολιτειών της Αμερικής, ένα από τα παλαιότερα γραπτά συντάγματα.",
"8-18": "18 Σεπτεμβρίου: Το 1851 εκδίδεται το πρώτο φύλλο της ιστορικής αμερικανικής εφημερίδας The New York Times.",
"8-20": "20 Σεπτεμβρίου: Το 1946 διοργανώνεται το πρώτο Διεθνές Φεστιβάλ Κινηματογράφου των Καννών στη Γαλλία.",
"8-22": "22 Σεπτεμβρίου: Το 1791 γεννιέται ο Μάικλ Φαραντέι, πρωτοπόρος στον ηλεκτρομαγνητισμό και την ηλεκτροχημεία.",
"8-23": "23 Σεπτεμβρίου: Το 1846 ο αστρονόμος Γιόχαν Γκάλε κοιτάζει το τηλεσκόπιό του και γίνεται ο πρώτος που εντοπίζει τον πλανήτη Ποσειδώνα.",
"8-24": "24 Σεπτεμβρίου: Το 2014 το ινδικό σκάφος Mangalyaan μπαίνει σε τροχιά γύρω από τον Άρη.",
"8-27": "27 Σεπτεμβρίου: Το 1822 ο Γάλλος επιστήμονας Σαμπολιόν ανακοινώνει ότι επιτέλους αποκρυπτογράφησε τα αρχαία αιγυπτιακά ιερογλυφικά.",
"8-29": "29 Σεπτεμβρίου: Το 1954 ιδρύεται το CERN, ο Ευρωπαϊκός Οργανισμός Πυρηνικής Έρευνας, στη Γενεύη.",
    // ΟΚΤΩΒΡΙΟΣ
"9-2": "2 Οκτωβρίου: Το 1925 ο Τζον Λόγκι Μπερντ πραγματοποιεί την πρώτη επιτυχημένη δοκιμή τηλεοπτικής μετάδοσης.",
"9-4": "4 Οκτωβρίου: Το 1957 ξεκινά η διαστημική εποχή, όταν η Σοβιετική Ένωση εκτοξεύει επιτυχώς τον Σπούτνικ 1, τον πρώτο δορυφόρο.",
"9-6": "6 Οκτωβρίου: Το 1995 ανακαλύπτεται ο πρώτος εξωπλανήτης (51 Pegasi b) που περιστρέφεται γύρω από ένα άστρο σαν τον Ήλιο μας.",
"9-8": "8 Οκτωβρίου: Το 1958 ο Σουηδός χειρουργός Άκε Σένινγκ εμφυτεύει τον πρώτο καρδιακό βηματοδότη σε ασθενή.",
"9-9": "9 Οκτωβρίου: Το 1874 ιδρύεται η Παγκόσμια Ταχυδρομική Ένωση, διευκολύνοντας την ανταλλαγή γραμμάτων μεταξύ διαφορετικών χωρών.",
"9-12": "12 Οκτωβρίου: Το 1492 οι ναύτες του Χριστόφορου Κολόμβου βλέπουν επιτέλους στεριά, φτάνοντας στην αμερικανική ήπειρο.",
"9-13": "13 Οκτωβρίου: Το 1884 ορίζεται ο μεσημβρινός του Γκρίνουιτς ως το σημείο μηδέν (0°) για τη μέτρηση του γεωγραφικού μήκους.",
"9-14": "14 Οκτωβρίου: Το 1947 ο αεροπόρος Τσακ Γιέγκερ γίνεται ο πρώτος άνθρωπος που πετάει πιο γρήγορα από την ταχύτητα του ήχου.",
"9-16": "1846: Το 1846 γίνεται στη Βοστώνη η πρώτη δημόσια επίδειξη χειρουργικής επέμβασης με χρήση αιθέρα ως αναισθητικού, αλλάζοντας για πάντα την ιατρική.",
"9-18": "18 Οκτωβρίου: Το 1922 ιδρύεται το βρετανικό δίκτυο BBC, που αργότερα έγινε ένας από τους μεγαλύτερους ραδιοτηλεοπτικούς οργανισμούς στον κόσμο.",
"9-19": "19 Οκτωβρίου: Το 1943 ανακαλύπτεται η στρεπτομυκίνη, το πρώτο αντιβιοτικό που μπόρεσε να θεραπεύσει τη δύσκολη ασθένεια της φυματίωσης.",
"9-22": "22 Οκτωβρίου: Το 1938 βγαίνει στην αγορά το πρώτο φωτοτυπικό μηχάνημα (ξηρογραφία) από τον Τσέστερ Κάρλσον.",
"9-23": "23 Οκτωβρίου: Το 2001 η Apple ανακοινάζει το πρώτο iPod, αλλάζοντας ριζικά τη βιομηχανία της ψηφιακής μουσικής.",
"9-24": "24 Οκτωβρίου: Το 1945 ξεκινά επίσημα η λειτουργία του Οργανισμού Ηνωμένων Εθνών (ΟΗΕ) για τη διαφύλαξη της ειρήνης.",
"9-27": "27 Οκτωβρίου: Το 1904 ανοίγει επίσημα το Μετρό της Νέας Υόρκης, ένα από τα παλαιότερα δίκτυα μεταφορών.",
"9-28": "28 Οκτωβρίου: Το 1886 γίνονται τα εγκαίνια του Αγάλματος της Ελευθερίας στη Νέα Υόρκη, που ήταν δώρο του γαλλικού λαού.",
    // ΝΟΕΜΒΡΙΟΣ
"10-3": "3 Νοεμβρίου: Το 1957 η σκυλίτσα Λάικα γράφει ιστορία ως το πρώτο ζώο που στάλθηκε από τους ανθρώπους σε τροχιά στο διάστημα.",
"10-4": "4 Νοεμβρίου: Το 2001 κάνει πρεμιέρα στο Λονδίνο η πρώτη ταινία με τις περιπέτειες του νεαρού μάγου Χάρι Πότερ.",
"10-5": "5 Νοεμβρίου: Το 2007 ανακοινώνεται το λειτουργικό σύστημα Android, που σήμερα χρησιμοποιείται στα περισσότερα κινητά τηλέφωνα παγκοσμίως.",
"10-7": "7 Νοεμβρίου: Το 1867 γεννιέται η Μαρία Κιουρί, η πρώτη γυναίκα που κέρδισε Νόμπελ και η μοναδική σε δύο διαφορετικές επιστήμες (Φυσική, Χημεία).",
"10-8": "8 Νοεμβρίου: Το 1895 ο επιστήμης Βίλχελμ Ρέντγκεν ανακαλύπτει τις ακτίνες Χ, επιτρέποντας στους γιατρούς να βλέπουν μέσα στο σώμα.",
"10-9": "9 Νοεμβρίου: Το 1989 πέφτει το Τείχος του Βερολίνου, ένα ιστορικό γεγονός-ορόσημο για την ενοποίηση της Ευρώπης.",
"10-11": "11 Νοεμβρίου: Το 1918 υπογράφεται η συνθήκη ανακωχής που βάζει τέλος στον καταστροφικό Πρώτο Παγκόσμιο Πόλεμο.",
"10-14": "14 Νοεμβρίου: Το 1969 ξεκινά η αποστολή Apollo 12, η οποία έστειλε τους επόμενους αστροναύτες να περπατήσουν στη Σελήνη.",
"10-15": "15 Νοεμβρίου: Το 1971 κυκλοφορεί ο Intel 4004, ο πρώτος εμπορικά διαθέσιμος μικροεπεξεργαστής στον κόσμο.",
"10-18": "18 Νοεμβρίου: Το 1928 ο διάσημος ποντικός Μίκυ Μάους εμφανίζεται επισήμως στο κοινό, στην κλασική ταινία «Steamboat Willie».",
"10-21": "21 Νοεμβρίου: Το 1783 γίνεται η πρώτη ελεύθερη πτήση ανθρώπων με αερόστατο, πετώντας πάνω από τις στέγες του Παρισιού.",
"10-22": "22 Νοεμβρίου: Το 1995 κάνει πρεμιέρα το «Toy Story», η πρώτη μεγάλου μήκους ταινία που δημιουργήθηκε εξ ολοκλήρου με γραφικά υπολογιστή (CGI).",
"10-24": "24 Νοεμβρίου: Το 1859 ο Άγγλος φυσιοδίφης Κάρολος Δαρβίνος εκδίδει το μνημειώδες βιβλίο του, «Η Καταγωγή των Ειδών».",
"10-25": "25 Νοεμβρίου: Το 1915 ο Άλμπερτ Αϊνστάιν παρουσιάζει την περίφημη Γενική Θεωρία της Σχετικότητας.",
"10-26": "1912: Η Θεσσαλονίκη απελευθερώνεται από τον Ελληνικό Στρατό.",
"10-30": "30 Νοεμβρίου: Το 1609 ο Γαλιλαίος στρέφει για πρώτη φορά το τηλεσκόπιό του στο φεγγάρι και παρατηρεί τους κρατήρες του.",

// ΔΕΚΕΜΒΡΙΟΣ
"11-1": "1 Δεκεμβρίου: Το 1913 ο Χένρι Φορντ ξεκινά την πρώτη γραμμή συναρμολόγησης, κατασκευάζοντας αυτοκίνητα πιο γρήγορα και πιο φθηνά.",
"11-2": "2 Δεκεμβρίου: Το 1942 ο Ενρίκο Φέρμι πραγματοποιεί στο Σικάγο την πρώτη ελεγχόμενη πυρηνική αλυσιδωτή αντίδραση.",
"11-3": "3 Δεκεμβρίου: Το 1967 ο γιατρός Κρίστιαν Μπάρναρντ πραγματοποιεί με επιτυχία την πρώτη μεταμόσχευση ανθρώπινης καρδιάς στη Νότια Αφρική.",
"11-4": "4 Δεκεμβρίου: Το 1998 λανσάρεται ο Διεθνής Διαστημικός Σταθμός (ISS) με την ένωση των πρώτων δύο τμημάτων του στο διάστημα.",
"11-5": "5 Δεκεμβρίου: Το 1901 γεννιέται ο Γουόλτ Ντίσνεϊ, ο οραματιστής δημιουργός που έδωσε ζωή στα πιο αγαπημένα κινούμενα σχέδια.",
"11-8": "8 Δεκεμβρίου: Το 1980 δολοφονείται ο Τζον Λένον, θρυλικό μέλος των Beatles και υποστηρικτής της παγκόσμιας ειρήνης.",
"11-10": "10 Δεκεμβρίου: Το 1901 απονέμονται τα πρώτα βραβεία Νόμπελ στη Σουηδία, τιμώντας σπουδαίους επιστήμονες και ειρηνιστές.",
"11-12": "12 Δεκεμβρίου: Το 1901 ο Γουλιέλμος Μαρκόνι λαμβάνει το πρώτο υπερατλαντικό ασύρματο ραδιοφωνικό σήμα.",
"11-13": "13 Δεκεμβρίου: Το 1972 οι αστροναύτες του Apollo 17 κάνουν τον τελευταίο περίπατο ανθρώπου στο φεγγάρι μέχρι και σήμερα.",
"11-15": "15 Δεκεμβρίου: Το 2001 ο Πύργος της Πίζας ανοίγει ξανά για το κοινό μετά από 11 χρόνια αυστηρών εργασιών σταθεροποίησης.",
"11-17": "17 Δεκεμβρίου: Το 1903 τα αδέλφια Ράιτ καταφέρνουν το αδύνατο: πετούν για 12 δευτερόλεπτα με το πρώτο μηχανοκίνητο αεροπλάνο.",
"11-18": "18 Δεκεμβρίου: Το 1856 γεννιέται ο Τζόζεφ Τζον Τόμσον, ο διακεκριμένος φυσικός που ανακάλυψε το ηλεκτρόνιο.",
"11-20": "20 Δεκεμβρίου: Το 1990 ο Τιμ Μπέρνερς-Λι δημοσιεύει την πρώτη ιστοσελίδα (website) στην ιστορία του διαδικτύου.",
"11-21": "21 Δεκεμβρίου: Το 1968 εκτοξεύεται το Apollo 8, το πρώτο διαστημόπλοιο με πλήρωμα που ταξίδεψε και έκανε τον γύρο της Σελήνης.",
"11-23": "23 Δεκεμβρίου: Το 1947 παρουσιάζεται το τρανζίστορ, η εφεύρεση-κλειδί που έκανε δυνατή τη σύγχρονη ηλεκτρονική.",
"11-27": "27 Δεκεμβρίου: Το 1571 γεννιέται ο Γιοχάνες Κέπλερ, ο σπουδαίος μαθηματικός και αστρονόμος που διατύπωσε τους νόμους της κίνησης των πλανητών.",
"11-28": "28 Δεκεμβρίου: Το 1895 οι αδελφοί Λιμιέρ οργανώνουν στο Παρίσι την πρώτη δημόσια προβολή κινηματογράφου με εισιτήριο.",
"11-30": "30 Δεκεμβρίου: Το 1924 ο αστρονόμος Έντουιν Χαμπλ ανακοινώνει ότι υπάρχουν και άλλοι γαλαξίες πέρα από τον δικό μας (Milky Way).",
// === ΝΕΑ ΚΕΝΑ - ΙΑΝΟΥΑΡΙΟΣ (0) ===
  "0-7": "7 Ιανουαρίου: Το 1610 ο Γαλιλαίος ανακαλύπτει με το τηλεσκόπιό του τους τέσσερις μεγαλύτερους δορυφόρους του πλανήτη Δία.",
  "0-13": "13 Ιανουαρίου: Το 1958 κάνει την πρώτη του εμφάνιση σε παιδικό βιβλίο ο αγαπημένος αρκούδος Πάντινγκτον.",
  "0-21": "21 Ιανουαρίου: Το 1976 το εντυπωσιακό υπερηχητικό αεροπλάνο Κονκόρντ (Concorde) ξεκινά τις πρώτες του πτήσεις με επιβάτες.",
  "0-26": "26 Ιανουαρίου: Το 1905 ανακαλύπτεται στη Νότια Αφρική το μεγαλύτερο διαμάντι του κόσμου, με το όνομα Κάλιναν.",
  "0-29": "29 Ιανουαρίου: Το 1886 ο Καρλ Μπεντς παίρνει το δίπλωμα ευρεσιτεχνίας για το πρώτο αυτοκίνητο που κινούνταν με βενζίνη.",

  // === ΝΕΑ ΚΕΝΑ - ΦΕΒΡΟΥΑΡΙΟΣ (1) ===
  "1-13": "13 Φεβρουαρίου: Το 1895 οι αδελφοί Λιμιέρ παίρνουν την έγκριση για τον «Κινηματογράφο», τη μηχανή που προβάλλει ταινίες.",
  "1-16": "16 Φεβρουαρίου: Το 1923 ο αρχαιολόγος Χάουαρντ Κάρτερ ανοίγει στην Αίγυπτο τον μυστικό τάφο του Φαραώ Τουταγχαμών.",
  "1-17": "17 Φεβρουαρίου: Το 1827 πεθαίνει ο Γιόχαν Πεσταλότσι, ο σπουδαίος δάσκαλος που υποστήριξε ότι τα παιδιά μαθαίνουν καλύτερα παίζοντας.",
  "1-20": "20 Φεβρουαρίου: Το 1962 ο Τζον Γκλεν γίνεται ο πρώτος Αμερικανός αστροναύτης που κάνει τον γύρο της Γης με το διαστημόπλοιό του.",
  "1-21": "21 Φεβρουαρίου: Το 1878 ο Τόμας Έντισον εφευρίσκει τον φωνόγραφο, το πρώτο μηχάνημα που μπορούσε να ηχογραφήσει και να παίξει ήχο!",
  "1-24": "24 Φεβρουαρίου: Το 1582 ανακοινώνεται το «Γρηγοριανό Ημερολόγιο», το οποίο είναι αυτό ακριβώς που χρησιμοποιούμε μέχρι και σήμερα.",
  "1-26": "26 Φεβρουαρίου: Το 1815 ο διάσημος Γάλλος στρατηγός Ναπολέων καταφέρνει να δραπετεύσει από την εξορία του στο νησί Έλβα.",
  "1-29": "29 Φεβρουαρίου: Το 1504 ο Χριστόφορος Κολόμβος χρησιμοποιεί τις γνώσεις του για την έκλειψη της σελήνης για να εντυπωσιάσει τους ιθαγενείς.",

  // === ΝΕΑ ΚΕΝΑ - ΜΑΡΤΙΟΣ (2) ===
  "2-8": "8 Μαρτίου: Το 1979 φτάνουν στη Γη οι πρώτες κοντινές φωτογραφίες από τους εντυπωσιακούς δακτυλίους του πλανήτη Δία.",
  "2-11": "11 Μαρτίου: Το 1955 φεύγει από τη ζωή ο Αλεξάντερ Φλέμινγκ, ο επιστήμονας που ανακάλυψε την πενικιλίνη και έσωσε εκατομμύρια ανθρώπους.",
  "2-16": "16 Μαρτίου: Το 1521 ο σπουδαίος εξερευνητής Μαγγελάνος φτάνει στις Φιλιππίνες στο μεγάλο ταξίδι του γύρω από τον κόσμο.",
  "2-27": "27 Μαρτίου: Το 1899 ο Γουλιέλμος Μαρκόνι καταφέρνει να στείλει το πρώτο ασύρματο μήνυμα πάνω από τη θάλασσα της Μάγχης.",
  "2-30": "30 Μαρτίου: Το 1858 ο Χάιμεν Λίπμαν κατασκευάζει κάτι πανέξυπνο: το πρώτο μολύβι που είχε ενσωματωμένη γομολάστιχα στο πίσω μέρος!",

  // === ΝΕΑ ΚΕΝΑ - ΑΠΡΙΛΙΟΣ (3) ===
  "3-20": "20 Απριλίου: Το 1902 η σπουδαία επιστήμονας Μαρία Κιουρί καταφέρνει να απομονώσει στο εργαστήριό της το χημικό στοιχείο ράδιο.",
  "3-23": "23 Απριλίου: Το 1616 φεύγουν από τη ζωή δύο μεγάλοι συγγραφείς, ο Ουίλιαμ Σαίξπηρ και ο Μιγκέλ ντε Θερβάντες.",
  "3-26": "26 Απριλίου: Το 1564 βαφτίζεται ο Ουίλιαμ Σαίξπηρ, που θα γινόταν ο πιο διάσημος συγγραφέας θεατρικών έργων στον κόσμο.",
  "3-29": "29 Απριλίου: Το 1913 κατασκευάζεται το πρώτο σύγχρονο φερμουάρ, κάνοντας το ντύσιμο των ανθρώπων πολύ πιο εύκολο.",
  "3-30": "30 Απριλίου: Το 1897 ο φυσικός Τζόζεφ Τζον Τόμσον ανακοινώνει ότι ανακάλυψε το ηλεκτρόνιο, ένα πολύ μικρό σωματίδιο της ύλης.",

  // === ΝΕΑ ΚΕΝΑ - ΜΑΪΟΣ (4) ===
  "4-4": "4 Μαΐου: Το 1904 ξεκινά η κατασκευή της Διώρυγας του Παναμά, ένα τεράστιο έργο για να περνούν τα καράβια από τον έναν ωκεανό στον άλλον.",
  "4-7": "7 Μαΐου: Το 1824 ο διάσημος συνθέτης Μπετόβεν παρουσιάζει για πρώτη φορά τη θρυλική 9η Συμφωνία του.",
  "4-9": "9 Μαΐου: Το 1502 ο εξερευνητής Χριστόφορος Κολόμβος ξεκινά με τα καράβια του το τέταρτο και τελευταίο του ταξίδι για την Αμερική.",
  "4-17": "17 Μαΐου: Το 1902 ο Έλληνας αρχαιολόγος Βαλέριος Στάης ανακαλύπτει τον Μηχανισμό των Αντικυθήρων, τον πρώτο «υπολογιστή» της αρχαιότητας.",
  "4-22": "22 Μαΐου: Το 1906 οι αδελφοί Ράιτ παίρνουν επισήμως το δίπλωμα ευρεσιτεχνίας για την ιπτάμενη μηχανή τους (το αεροπλάνο).",
  "4-26": "26 Μαΐου: Το 1897 κυκλοφορεί στα βιβλιοπωλεία η κλασική ιστορία μυστηρίου «Δράκουλας» του συγγραφέα Μπραμ Στόκερ.",
  "4-30": "30 Μαΐου: Το 1911 διεξάγεται στην Αμερική ο πρώτος ιστορικός αγώνας γρήγορων αυτοκινήτων, το θρυλικό «Ιντιανάπολις 500».",
  "4-31": "31 Μαΐου: Το 1859 το μεγάλο ρολόι Μπιγκ Μπεν (Big Ben) ψηλά στον πύργο του Λονδίνου αρχίζει να χτυπά για πρώτη φορά.",

  // === ΝΕΑ ΚΕΝΑ - ΙΟΥΝΙΟΣ (5) ===
  "5-2": "2 Ιουνίου: Το 1875 ο Αλεξάντερ Γκράχαμ Μπελ κάνει την πρώτη δοκιμή μετάδοσης ήχου που θα οδηγούσε στην ανακάλυψη του τηλεφώνου.",
  "5-17": "17 Ιουνίου: Το 1885 το τεράστιο Άγαλμα της Ελευθερίας φτάνει στη Νέα Υόρκη από τη Γαλλία... διαλυμένο μέσα σε 214 κιβώτια!",
  "5-24": "24 Ιουνίου: Το 1901 ανοίγει στο Παρίσι η πρώτη έκθεση με έργα ζωγραφικής ενός 19χρονου καλλιτέχνη, του Πάμπλο Πικάσο.",
  "5-26": "26 Ιουνίου: Το 1997 κυκλοφορεί το πρώτο βιβλίο της σειράς «Χάρι Πότερ», μαγεύοντας τα παιδιά σε όλο τον κόσμο.",
  "5-29": "29 Ιουνίου: Το 2007 κυκλοφορεί στα καταστήματα το πρώτο κινητό τηλέφωνο iPhone, αλλάζοντας την τεχνολογία.",

  // === ΝΕΑ ΚΕΝΑ - ΙΟΥΛΙΟΣ (6) ===
  "6-11": "11 Ιουλίου: Το 1930 ξεκινά στην Ουρουγουάη το πρώτο Παγκόσμιο Κύπελλο Ποδοσφαίρου, το γνωστό μας Μουντιάλ.",
  "6-13": "13 Ιουλίου: Το 1923 τοποθετείται για πρώτη φορά το διάσημο σήμα με τα μεγάλα γράμματα HOLLYWOOD στους λόφους του Λος Άντζελες.",
  "6-15": "15 Ιουλίου: Το 1799 ανακαλύπτεται στην Αίγυπτο η Στήλη της Ροζέττας, χάρη στην οποία οι επιστήμονες διάβασαν τα αρχαία ιερογλυφικά.",
  "6-19": "19 Ιουλίου: Το 1976 το διαστημικό ρομπότ Viking 1 της NASA προσεδαφίζεται επιτυχώς στην επιφάνεια του Άρη.",
  "6-22": "22 Ιουλίου: Το 1933 ο πιλότος Γουάιλι Ποστ γίνεται ο πρώτος άνθρωπος που πετάει ολομόναχος γύρω από τον κόσμο.",
  "6-23": "23 Ιουλίου: Το 1911 ανακαλύπτεται από εξερευνητές η αρχαία πόλη Μάτσου Πίτσου των Ίνκας, ψηλά στα βουνά του Περού.",
  "6-24": "24 Ιουλίου: Το 1909 ο πιλότος Λουί Μπλεριό καταφέρνει να περάσει με το αεροπλάνο του το στενό της Μάγχης πάνω από τη θάλασσα.",
  "6-25": "25 Ιουλίου: Το 1814 ο μηχανικός Τζορτζ Στίβενσον δοκιμάζει με επιτυχία την πρώτη ατμομηχανή τρένου στις ράγες.",
  "6-27": "27 Ιουλίου: Το 1940 κάνει την πρώτη του εμφάνιση στην τηλεόραση ο Μπαγκς Μπάνι, ο διάσημος λαγός των κινουμένων σχεδίων.",
  "6-28": "28 Ιουλίου: Το 1858 γίνεται η πρώτη επιτυχημένη χρήση των δακτυλικών αποτυπωμάτων για την αναγνώριση ενός ανθρώπου.",

  // === ΝΕΑ ΚΕΝΑ - ΑΥΓΟΥΣΤΟΣ (7) ===
  "7-2": "2 Αυγούστου: Το 1958 το αμερικανικό υποβρύχιο «Ναυτίλος» γίνεται το πρώτο που περνάει κάτω από τους πάγους του Βόρειου Πόλου.",
  "7-7": "7 Αυγούστου: Το 1947 το ξύλινο καράβι «Κον-Τίκι» φτάνει στην Πολυνησία διασχίζοντας τον ωκεανό, ολοκληρώνοντας μια μεγάλη περιπέτεια.",
  "7-8": "8 Αυγούστου: Το 1831 το πρώτο ατμοκίνητο επιβατικό τρένο ξεκινάει τα δρομολόγιά του στην Αμερική.",
  "7-10": "10 Αυγούστου: Το 1519 ο Πορτογάλος θαλασσοπόρος Μαγγελάνος ξεκινά το τεράστιο ταξίδι του για να κάνει τον γύρο της Γης.",
  "7-11": "11 Αυγούστου: Το 1999 συμβαίνει η τελευταία ολική έκλειψη Ηλίου του 20ού αιώνα, προσφέροντας ένα μοναδικό θέαμα.",
  "7-13": "13 Αυγούστου: Το 1889 εφευρίσκεται ο πρώτος τηλεφωνικός κερματοδέκτης, δηλαδή το γνωστό μας καρτοτηλέφωνο με κέρματα.",
  "7-16": "16 Αυγούστου: Το 1896 ανακαλύπτεται χρυσός στο Κλόνταϊκ του Καναδά, ξεκινώντας τον μεγάλο «Πυρετό του Χρυσού».",
  "7-18": "18 Αυγούστου: Το 1868 ο Γάλλος αστρονόμος Πιέρ Ζανσέν ανακαλύπτει το στοιχείο ήλιον παρατηρώντας μια έκλειψη του Ήλιου.",
  "7-19": "19 Αυγούστου: Το 1960 στέλνονται στο διάστημα τα δύο γενναία σκυλάκια Μπέλκα και Στρέλκα και επιστρέφουν σώα πίσω στη Γη!",
  "7-25": "25 Αυγούστου: Το 1609 ο επιστήμονας Γαλιλαίος παρουσιάζει το πρώτο δυνατό τηλεσκόπιο στους έκπληκτους άρχοντες της Βενετίας.",
  "7-30": "30 Αυγούστου: Το 1871 γεννιέται ο Έρνεστ Ράδερφορντ, ο φυσικός που μάς εξήγησε από τι είναι φτιαγμένο το κέντρο του ατόμου.",

  // === ΝΕΑ ΚΕΝΑ - ΣΕΠΤΕΜΒΡΙΟΣ (8) ===
  "8-4": "4 Σεπτεμβρίου: Το 1998 ιδρύεται η διάσημη εταιρεία Google από δύο φοιτητές πανεπιστημίου, τον Λάρι Πέιτζ και τον Σεργκέι Μπριν.",
  "8-8": "8 Σεπτεμβρίου: Το 1522 το καράβι «Βικτώρια», το μόνο που απέμεινε από τον στόλο του Μαγγελάνου, ολοκληρώνει τον γύρο του κόσμου.",
  "8-10": "10 Σεπτεμβρίου: Το 2008 ξεκινάει τη λειτουργία της στην Ελβετία η μεγαλύτερη μηχανή στον κόσμο (ο επιταχυντής CERN).",
  "8-11": "11 Σεπτεμβρίου: Το 1962 η Αμερική ανακοινώνει επίσημα το μεγάλο της σχέδιο να στείλει τον πρώτο άνθρωπο στη Σελήνη.",
  "8-15": "15 Σεπτεμβρίου: Το 1835 το ερευνητικό πλοίο του επιστήμονα Κάρολου Δαρβίνου φτάνει στα εξωτικά νησιά Γκαλαπάγκος.",
  "8-16": "16 Σεπτεμβρίου: Το 1620 το καράβι «Μέιφλαουερ» ξεκινά από την Αγγλία για την Αμερική, μεταφέροντας τους πρώτους ταξιδιώτες.",
  "8-19": "19 Σεπτεμβρίου: Το 1783 σηκώνεται το πρώτο αερόστατο, βάζοντας για επιβάτες ένα πρόβατο, έναν κόκορα και μια πάπια!",
  "8-21": "21 Σεπτεμβρίου: Το 1937 εκδίδεται το αγαπημένο βιβλίο φαντασίας «Το Χόμπιτ» του συγγραφέα Τζ. Ρ. Ρ. Τόλκιν.",
  "8-25": "25 Σεπτεμβρίου: Το 1513 ο εξερευνητής Βάσκο Νούνιες ντε Μπαλμπόα γίνεται ο πρώτος Ευρωπαίος που αντικρίζει τον Ειρηνικό Ωκεανό.",
  "8-26": "26 Σεπτεμβρίου: Το 1580 ο Βρετανός θαλασσοπόρος Φράνσις Ντρέικ επιστρέφει στην πατρίδα του έχοντας κάνει τον γύρο του κόσμου.",
  "8-28": "28 Σεπτεμβρίου: Το 1892 παίζεται ο πρώτος αγώνας ποδοσφαίρου τη νύχτα, χρησιμοποιώντας μεγάλους ηλεκτρικούς προβολείς φωτός.",
  "8-30": "30 Σεπτεμβρίου: Το 1968 το τεράστιο αεροπλάνο Boeing 747 βγαίνει για πρώτη φορά από το εργοστάσιο κατασκευής του.",

  // === ΝΕΑ ΚΕΝΑ - ΟΚΤΩΒΡΙΟΣ (9) ===
  "9-1": "1 Οκτωβρίου: Το 1958 ιδρύεται επίσημα η Αμερικανική Διαστημική Υπηρεσία, γνωστή σε όλους μας ως NASA.",
  "9-3": "3 Οκτωβρίου: Το 1952 κυκλοφορεί το πρώτο περιοδικό κόμικ με τις περιπέτειες του αγαπημένου αρκούδου Ρούπερτ.",
  "9-5": "5 Οκτωβρίου: Το 1962 προβάλλεται στους κινηματογράφους η πρώτη ταινία με τον διάσημο μυστικό πράκτορα Τζέιμς Μποντ.",
  "9-7": "7 Οκτωβρίου: Το 1959 το διαστημικό σκάφος Luna 3 καταφέρνει να βγάλει φωτογραφία τη «σκοτεινή» πίσω πλευρά της Σελήνης.",
  "9-10": "10 Οκτωβρίου: Το 1846 ο Βρετανός αστρονόμος Ουίλιαμ Λάσελ ανακαλύπτει τον Τρίτωνα, το μεγαλύτερο φεγγάρι του πλανήτη Ποσειδώνα.",
  "9-11": "11 Οκτωβρίου: Το 1968 εκτοξεύεται το Apollo 7, το πρώτο διαστημόπλοιο του προγράμματος που θα πήγαινε τον άνθρωπο στο φεγγάρι.",
  "9-15": "15 Οκτωβρίου: Το 1997 εκτοξεύεται το διαστημόπλοιο Cassini-Huygens για το μακρινό του ταξίδι προς τον πλανήτη Κρόνο.",
  "9-17": "17 Οκτωβρίου: Το 1851 κυκλοφορεί το σπουδαίο βιβλίο «Μόμπι Ντικ», που αφηγείται την ιστορία μιας τεράστιας λευκής φάλαινας.",
  "9-20": "20 Οκτωβρίου: Το 1973 εγκαινιάζεται η εντυπωσιακή Όπερα του Σίδνεϊ, το κτίριο με τις λευκές στέγες που μοιάζουν με πανιά πλοίου.",
  "9-21": "21 Οκτωβρίου: Το 1879 ο Τόμας Έντισον καταφέρνει να κρατήσει αναμμένη μια ηλεκτρική λάμπα για περισσότερες από 13 ώρες.",
  "9-25": "25 Οκτωβρίου: Το 1881 γεννιέται ο Πάμπλο Πικάσο, ο οποίος μεγάλωσε και έγινε ένας από τους πιο διάσημους ζωγράφους του κόσμου.",
  "9-26": "26 Οκτωβρίου: Το 1863 ιδρύεται στο Λονδίνο η πρώτη Ποδοσφαιρική Ομοσπονδία, γράφοντας τους πρώτους κανόνες του αθλήματος.",
  "9-29": "29 Οκτωβρίου: Το 1969 δύο υπολογιστές στέλνουν το πρώτο μήνυμα μεταξύ τους στο δίκτυο ARPANET, τον πρόγονο του διαδικτύου.",
  "9-30": "30 Οκτωβρίου: Το 1938 μια ραδιοφωνική εκπομπή για εξωγήινους ακουγόταν τόσο αληθινή, που οι ακροατές πίστεψαν ότι έγινε εισβολή!",
  "9-31": "31 Οκτωβρίου: Το 1925 ο διάσημος μάγος Χάρι Χουντίνι κάνει ένα από τα πιο δύσκολα κόλπα απόδρασης της καριέρας του.",

  // === ΝΕΑ ΚΕΝΑ - ΝΟΕΜΒΡΙΟΣ (10) ===
  "10-1": "1 Νοεμβρίου: Το 1894 αρχίζει να εκδίδεται στο Παρίσι το αγαπημένο περιοδικό ιστοριών και κόμικ «Le Petit Journal».",
  "10-2": "2 Νοεμβρίου: Το 1936 ξεκινάει τις εκπομπές του στο Λονδίνο το πρώτο τηλεοπτικό κανάλι υψηλής ποιότητας (BBC).",
  "10-6": "6 Νοεμβρίου: Το 1869 διεξάγεται στην Αμερική ο πρώτος ιστορικός αγώνας αμερικανικού ποδοσφαίρου ανάμεσα σε δύο πανεπιστήμια.",
  "10-10": "10 Νοεμβρίου: Το 1969 η διάσημη παιδική εκπομπή με κούκλες «Sesame Street» (Σουσάμι Άνοιξε) κάνει πρεμιέρα στην τηλεόραση.",
  "10-12": "12 Νοεμβρίου: Το 1980 το ρομποτικό διαστημόπλοιο Voyager 1 περνά πολύ κοντά από τον πλανήτη Κρόνο και βγάζει φωτογραφίες.",
  "10-13": "13 Νοεμβρίου: Το 1971 το διαστημόπλοιο Mariner 9 γίνεται το πρώτο ανθρώπινο σκάφος που μπαίνει σε τροχιά γύρω από τον Άρη.",
  "10-16": "16 Νοεμβρίου: Το 1869 ανοίγει η Διώρυγα του Σουέζ, επιτρέποντας στα πλοία να περνούν γρήγορα από τη Μεσόγειο στην Ασία.",
  "10-17": "17 Νοεμβρίου: Το 1970 ο εφευρέτης Ντάγκλας Ένγκελμπαρτ παίρνει το δίπλωμα ευρεσιτεχνίας για το γνωστό μας «ποντίκι» υπολογιστή.",
  "10-19": "19 Νοεμβρίου: Το 1493 ο εξερευνητής Χριστόφορος Κολόμβος ανακαλύπτει το όμορφο νησί του Πουέρτο Ρίκο.",
  "10-20": "20 Νοεμβρίου: Το 1985 κυκλοφορεί από την εταιρεία Microsoft το πρώτο λειτουργικό σύστημα Windows για τους υπολογιστές.",
  "10-23": "23 Νοεμβρίου: Το 1889 τοποθετείται σε ένα κατάστημα στο Σαν Φρανσίσκο το πρώτο αυτόματο μηχάνημα μουσικής (Τζουκ-Μποξ).",
  "10-27": "27 Νοεμβρίου: Το 1520 ο Μαγγελάνος και ο στόλος του βγαίνουν στον Ειρηνικό Ωκεανό, ονομάζοντάς τον έτσι επειδή ήταν πολύ ήρεμος.",
  "10-28": "28 Νοεμβρίου: Το 1929 ο πιλότος Ρίτσαρντ Μπερντ γίνεται ο πρώτος άνθρωπος που πετάει με αεροπλάνο πάνω από τον Νότιο Πόλο!",
  "10-29": "29 Νοεμβρίου: Το 1972 κυκλοφορεί το θρυλικό «Pong», ένα από τα πρώτα βιντεοπαιχνίδια όπου παίζεις ηλεκτρονικό τένις με ρακετάκια.",

  // === ΝΕΑ ΚΕΝΑ - ΔΕΚΕΜΒΡΙΟΣ (11) ===
  "11-6": "6 Δεκεμβρίου: Το 1972 ξεκινά το ταξίδι του το Apollo 17, που ήταν η τελευταία φορά που ταξίδεψαν άνθρωποι στη Σελήνη.",
  "11-7": "7 Δεκεμβρίου: Το 1732 ανοίγει τις πόρτες της στο Λονδίνο η υπέροχη Βασιλική Όπερα του Κόβεντ Γκάρντεν.",
  "11-9": "9 Δεκεμβρίου: Το 1968 παρουσιάζεται για πρώτη φορά στο κοινό ένας υπολογιστής που δούλευε με... ποντίκι!",
  "11-11": "11 Δεκεμβρίου: Το 1901 φτάνει με επιτυχία το πρώτο ασύρματο μήνυμα στην άλλη άκρη του Ατλαντικού Ωκεανού (το γράμμα S σε μορς).",
  "11-14": "14 Δεκεμβρίου: Το 1911 ο εξερευνητής Ρόαλντ Αμούνδσεν και η ομάδα του γίνονται οι πρώτοι άνθρωποι που πατούν στον Νότιο Πόλο.",
  "11-16": "16 Δεκεμβρίου: Το 1770 γεννιέται ο Λούντβιχ βαν Μπετόβεν, ένας από τους σπουδαιότερους δημιουργούς κλασικής μουσικής.",
  "11-19": "19 Δεκεμβρίου: Το 1958 ο πρώτος δορυφόρος επικοινωνίας εκπέμπει από το διάστημα ένα χριστουγεννιάτικο μήνυμα ειρήνης.",
  "11-22": "22 Δεκεμβρίου: Το 1938 οι επιστήμονες ανακαλύπτουν στον ωκεανό ένα ζωντανό ψάρι «Κοιλάκανθο», ενώ νόμιζαν ότι είχε εξαφανιστεί μαζί με τους δεινόσαυρους!",
  "11-24": "24 Δεκεμβρίου: Το 1968 οι αστροναύτες του Apollo 8 τραβούν την πιο διάσημη φωτογραφία της Γης καθώς «ανατέλλει» πίσω από το φεγγάρι.",
  "11-25": "25 Δεκεμβρίου: Το 1822 γεννιέται ο Λουί Παστέρ, ο επιστήμονας που βρήκε τον τρόπο να προστατεύει τα τρόφιμά μας από τα μικρόβια.",
  "11-26": "26 Δεκεμβρίου: Το 1898 οι επιστήμονες Πιέρ και Μαρία Κιουρί ανακοινώνουν επίσημα ότι ανακάλυψαν ένα νέο στοιχείο, το ράδιο.",
  "11-29": "29 Δεκεμβρίου: Το 1852 γεννιέται ο φυσικός Άλμπερτ Μάικελσον, ο οποίος κατάφερε να μετρήσει με μεγάλη ακρίβεια πόσο γρήγορα ταξιδεύει το φως.",
  "11-31": "31 Δεκεμβρίου: Το 1879 ο Τόμας Έντισον ανάβει δημόσια για πρώτη φορά τους νέους του ηλεκτρικούς λαμπτήρες, φωτίζοντας τη νύχτα."
       
    },

    // [ΒΑΛΕ ΕΔΩ ΟΛΕΣ ΤΙΣ ΑΠΟΣΤΟΛΕΣ ΣΟΥ dynamicMissionsPC]
    dynamicMissionsPC: {
     space: [
    "Γίνε αστρονόμος! Απόψε το βράδυ, κοίτα τον ουρανό και προσπάθησε να εντοπίσεις το πιο φωτεινό αστέρι ή το φεγγάρι.",
    "Σχεδίασε σε ένα πρόχειρο χαρτί τον δικό σου πύραυλο. Τι τρελό όνομα θα του έδινες;",
    "Αν συναντούσες έναν εξωγήινο, ποια θα ήταν η πρώτη λέξη που θα του μάθαινες στη γλώσσα μας;",
    "Περπάτησε στο δωμάτιο σε αργή κίνηση, σαν να βρίσκεσαι στο φεγγάρι και δεν υπάρχει βαρύτητα!",
    "Φτιάξε έναν δικό σου φανταστικό αστερισμό ενώνοντας 5 τελείες στο χαρτί. Τι σχήμα βγήκε;",
    "Αν ταξίδευες στον Άρη και χωρούσαν μόνο 3 πράγματα στο σακίδιό σου, ποια θα ήταν αυτά;",
    "Φαντάσου ότι ανακαλύπτεις έναν νέο πλανήτη. Τι χρώμα θα είχε και από τι θα ήταν φτιαγμένος;",
    "Ζωγράφισε τον Ήλιο, αλλά αντί για κίτρινο, δώσε του τα χρώματα που σου αρέσουν περισσότερο.",
    "Κάνε την αντίστροφη μέτρηση (10, 9, 8...) και κάνε αναπαράσταση μιας εκτόξευσης!",
    "Φτιάξε έναν μικρό 'δορυφόρο' χρησιμοποιώντας λίγο αλουμινόχαρτο από την κουζίνα.",
    "Πόσα δευτερόλεπτα μπορείς να κρατήσεις την αναπνοή σου, σαν να βρίσκεσαι στο κενό του διαστήματος;",
    "Κλείσε τα μάτια και φαντάσου τον ήχο που κάνει ένας τεράστιος πύραυλος. Κάνε τον ήχο με το στόμα σου!"
  ],
  tech: [
    "Ώρα για πείραμα! Πάρε έναν πλαστικό χάρακα, τρίψε τον στα μαλλιά σου και δες αν σηκώνει μικρά χαρτάκια.",
    "Σκέψου ένα μικρό πρόβλημα στο δωμάτιό σου. Ποια τρελή εφεύρεση θα έφτιαχνες για να το λύσεις;",
    "Προσπάθησε να περάσεις την επόμενη 1 ώρα χωρίς να κοιτάξεις απολύτως καμία ηλεκτρονική οθόνη!",
    "Φαντάσου ότι φτιάχνεις ένα μικρό, ξύλινο ρομπότ-μασκότ για την τάξη. Τι σχήμα θα είχε το κεφάλι του;",
    "Βρες στο σπίτι την πιο παλιά ηλεκτρική συσκευή. Πόσο νομίζεις ότι μοιάζει με τις σημερινές;",
    "Φτιάξε ένα «κρυπτογραφημένο» μήνυμα, γράφοντας τις λέξεις ανάποδα και δώστο σε κάποιον να το διαβάσει.",
    "Ζωγράφισε το αυτοκίνητο του μέλλοντος! Θα πετάει; Θα πηγαίνει κάτω από το νερό;",
    "Γίνε μηχανικός: Προσπάθησε να φτιάξεις μια μικρή γέφυρα χρησιμοποιώντας μόνο 3 βιβλία και 1 μολύβι.",
    "Τι θα έκανες σήμερα αν ξαφνικά κοβόταν το ρεύμα για όλη την υπόλοιπη μέρα;",
    "Βάλε ένα τραγούδι να παίζει και δοκίμασε να χτυπήσεις τον ρυθμό του σαν να στέλνεις σήμα Μορς στο τραπέζι.",
    "Αν μπορούσες να προσθέσεις ένα μαγικό κουμπί στο τηλέφωνό σου, τι θα έκανε όταν το πατούσες;",
    "Σχεδίασε ένα ιπτάμενο ποδήλατο! Τι θα χρειαζόταν για να μπορέσει να σηκωθεί από το έδαφος;"
  ],
  arts: [
    "Γίνε συγγραφέας! Γράψε στο τετράδιό σου μια μικρή ιστορία μυστηρίου χρησιμοποιώντας μόνο 3 προτάσεις.",
    "Φτιάξε μια ζωγραφιά χρησιμοποιώντας μόνο γεωμετρικά σχήματα (τρίγωνα, κύκλους), όπως ο Πικάσο!",
    "Ποιος είναι ο αγαπημένος σου ήρωας κινουμένων σχεδίων; Κάνε μια αστεία μίμηση της φωνής του.",
    "Τραγούδησε το ρεφρέν του αγαπημένου σου τραγουδιού... αλλά με φωνή οπερατικού τραγουδιστή!",
    "Δοκίμασε να γράψεις το μικρό σου όνομα σε ένα χαρτί χρησιμοποιώντας το «άλλο» σου χέρι.",
    "Παίξε παντομίμα! Προσπάθησε να περιγράψεις χωρίς λόγια το σημερινό ιστορικό γεγονός σε κάποιον.",
    "Γίνε γραφίστας: Σχεδίασε ένα ολοκαίνουργιο, δικό σου λογότυπο που να έχει το αρχικό σου γράμμα.",
    "Χόρεψε για 30 δευτερόλεπτα σαν να είσαι ένα ρομπότ που μόλις του έβαλαν μπαταρίες.",
    "Χώρισε ένα χαρτί στα τρία και φτιάξε ένα γρήγορο κόμικ με 3 κουτάκια για κάτι αστείο που έγινε σήμερα.",
    "Αν η σημερινή μέρα ήταν ταινία, τι τίτλο θα της έδινες και ποιος θα έπαιζε τον πρωταγωνιστή;",
    "Φτιάξε ένα μικρό ποιηματάκι 2 σειρών που να κάνει ρίμα, με θέμα τον σημερινό καιρό.",
    "Ζωγράφισε το εξώφυλλο ενός βιβλίου που δεν έχει γραφτεί ακόμα, αλλά θα ήθελες πολύ να διαβάσεις!"
  ],
  history: [
    "Γίνε εξερευνητής του σπιτιού! Κρύψε ένα αντικείμενο, φτιάξε έναν χάρτη και δώστον σε κάποιον να το βρει.",
    "Αν είχες μια χρονομηχανή, σε ποια εποχή της ιστορίας θα ήθελες να ταξιδέψεις για μια μέρα;",
    "Ρώτησε έναν γονιό ή παππού να σου πει μια ιστορία για το πώς ήταν η γειτονιά σας όταν ήταν παιδί.",
    "Γίνε Βασιλιάς/Βασίλισσα για 1 λεπτό: Ποιος θα ήταν ο πρώτος καλός νόμος που θα έβαζες στη χώρα σου;",
    "Φτιάξε ένα γρήγορο στέμμα από χαρτί, ζωγράφισέ το και φόρεσέ το!",
    "Φαντάσου ότι είσαι γενναίος ιππότης. Σχεδίασε τον θυρεό (το σήμα) που θα είχε η ασπίδα σου.",
    "Τι φαγητό πιστεύεις ότι θα έτρωγαν τα παιδιά στην Αρχαία Ελλάδα για πρωινό;",
    "Βρες μια παλιά φωτογραφία στο σπίτι. Προσπάθησε να μαντέψεις τι σκεφτόταν ο άνθρωπος που πόζαρε.",
    "Σκέψου μια διαφωνία που είχες πρόσφατα. Πώς θα μπορούσες να την έχεις λύσει σαν σωστός διπλωμάτης;",
    "Ζωγράφισε ένα ψηλό κάστρο με γέφυρα. Ποιος ζει εκεί μέσα;",
    "Αν ζούσες πριν 200 χρόνια, χωρίς αυτοκίνητα, πώς θα πήγαινες μέχρι το σχολείο;",
    "Σκέψου 3 ερωτήσεις που θα έκανες σε έναν άνθρωπο που έζησε κατά τη διάρκεια της Γαλλικής Επανάστασης."
  ],
  exploration: [
    "Προς τα πού πέφτει ο Βορράς; Προσπάθησε να μαντέψεις πού είναι τα σημεία του ορίζοντα στο δωμάτιό σου.",
    "Ζωγράφισε ένα εντυπωσιακό πειρατικό ή εξερευνητικό καράβι με μεγάλα πανιά.",
    "Ανακάλυψες ένα νέο νησί στον ωκεανό! Σχεδίασε γρήγορα τον χάρτη του και δώσε του όνομα.",
    "Γίνε ναυτικός: Προσπάθησε να δέσεις έναν γερό κόμπο με ένα κορδόνι από το παπούτσι σου.",
    "Κλείσε τα μάτια και περπάτα από τη μια άκρη του δωματίου στην άλλη (με προσοχή!). Ήταν εύκολο;",
    "Σχεδίασε μια σημαία για τη δική σου φανταστική ομάδα εξερευνητών.",
    "Τι θα έβαζες σε ένα σακίδιο αν ξεκινούσες για ορειβασία στα Ιμαλάια;",
    "Φτιάξε ένα καραβάκι από χαρτί και δες αν μπορεί να επιπλεύσει σε μια λεκάνη με νερό.",
    "Βρες 3 διαφορετικές χώρες σε έναν χάρτη ή υδρόγειο σφαίρα (αν έχεις). Ποια είναι η πιο μακρινή;",
    "Πώς λένε «γεια» στην άλλη άκρη του κόσμου; Ψάξε να βρεις πώς χαιρετάνε στην Ιαπωνία!",
    "Ζωγράφισε ένα πανύψηλο χιονισμένο βουνό. Τι υπάρχει πίσω από την κορυφή του;",
    "Φαντάσου ότι είσαι καπετάνιος. Φώναξε μια δυνατή εντολή στο (φανταστικό) πλήρωμά σου!"
  ],
  science: [
    "Πόσο ψηλός/ή είσαι... σε παλάμες; Μέτρα το ύψος σου βάζοντας τη μια παλάμη πάνω στην άλλη!",
    "Αν ανακατέψεις μπλε με κίτρινο χρώμα, τι βγαίνει; Δοκίμασε το με τις ξυλομπογιές ή τους μαρκαδόρους σου.",
    "Πάρε ένα μολύβι και προσπάθησε να το ισορροπήσεις οριζόντια στο ένα σου δάχτυλο (το κέντρο βάρους!).",
    "Βάλε το χέρι σου στην καρδιά. Πόσο γρήγορα χτυπάει; Κάνε 10 επιτόπια πηδηματάκια και ξαναμέτρα!",
    "Γίνε ντετέκτιβ: Πάρε έναν μεγεθυντικό φακό (ή φτιάξε έναν σταγόνα νερό σε διάφανο πλαστικό) και δες μια κλωστή.",
    "Βάλε έναν φακό (από το κινητό ίσως) να ρίχνει φως στον τοίχο και φτιάξε μια αστεία σκιά με τα χέρια σου.",
    "Μπορείς να λύσεις έναν γρίφο; 'Τι μεγαλώνει όταν τρώει, αλλά πεθαίνει όταν πίνει νερό;' (Η φωτιά!)",
    "Βρες ένα αντικείμενο στο δωμάτιο που να μαγνητίζεται (αν έχεις ένα μαγνητάκι ψυγείου).",
    "Κοίτα έξω τα σύννεφα. Βλέπεις κάποιο που να μοιάζει με ζώο ή αντικείμενο;",
    "Πείραμα στο νερό: Βάλε ένα κέρμα και ένα πλαστικό καπάκι σε νερό. Ποιο βουλιάζει και ποιο επιπλέει;",
    "Μέτρα μέχρι το 10 στο μυαλό σου, προσπαθώντας να υπολογίσεις ακριβώς 1 δευτερόλεπτο τη φορά.",
    "Ζωγράφισε τον διάσημο φυσικό Άλμπερτ Αϊνστάιν, μην ξεχάσεις τα τρελά του μαλλιά!"
  ],
  biology: [
    "Βγες έξω (ή στο μπαλκόνι) και βρες 3 διαφορετικά σχήματα από φύλλα φυτών.",
    "Άκουσε τη φύση: Κλείσε τα μάτια για 30 δευτερόλεπτα με το παράθυρο ανοιχτό. Πόσους ήχους άκουσες;",
    "Ζωγράφισε έναν τρομακτικό αλλά αστείο δεινόσαυρο! Τι χρώμα νομίζεις ότι είχαν τελικά;",
    "Αν ήσουν δέντρο, πώς θα ένιωθες τον χειμώνα; Κάνε τα χέρια σου κλαδιά στον αέρα!",
    "Προσπάθησε να σταθείς στο ένα πόδι σαν φλαμίνγκο για 20 δευτερόλεπτα χωρίς να πέσεις.",
    "Ζωγράφισε ένα μικρόβιο μέσα από το 'μικροσκόπιό' σου. Βάλτου και αστεία μάτια!",
    "Ξέρεις πόσα οστά έχει ο άνθρωπος; (Περίπου 206!). Προσπάθησε να ψηλαφίσεις 5 διαφορετικά.",
    "Πάρε 3 πολύ βαθιές αναπνοές (μέσα από τη μύτη, έξω από το στόμα) για να γεμίσεις τους πνεύμονές σου οξυγόνο.",
    "Ζωγράφισε το αγαπημένο σου ζώο. Ποιο είναι το πιο έξυπνο χαρακτηριστικό που έχει για να επιβιώνει;",
    "Φαντάσου ότι είσαι αετός. Άνοιξε τα 'φτερά' σου και κάνε έναν κύκλο στο δωμάτιο.",
    "Σκέψου ένα υγιεινό σνακ που θα σου έδινε ενέργεια. Ζωγράφισέ το στο τετράδιό σου.",
    "Δείξε πώς πλένουμε σωστά τα χέρια μας με (φανταστικό) σαπούνι για 20 δευτερόλεπτα!"
  ],
  sports: [
    "Κάνε αμέσως 10 επιτόπια πηδηματάκια για να ξυπνήσεις το σώμα σου!",
    "Προσπάθησε να ισορροπήσεις ένα βιβλίο στο κεφάλι σου και να κάνεις 3 βήματα μπροστά.",
    "Φτιάξε μια μπάλα από τσαλακωμένο χαρτί και δοκίμασε 3 'βολές' στον κάδο απορριμμάτων.",
    "Τρέξε επιτόπου όσο πιο γρήγορα μπορείς για 15 δευτερόλεπτα!",
    "Γίνε εφευρέτης παιχνιδιών: Σκέψου ένα εντελώς νέο άθλημα που να παίζεται με μια μπάλα και ένα σκοινί.",
    "Ζωγράφισε τους 5 ολυμπιακούς κύκλους. Ξέρεις ποια χρώματα έχουν;",
    "Σκέψου ένα δυναμικό σύνθημα για την αγαπημένη σου ομάδα (ή για το τμήμα σου στο σχολείο!).",
    "Κάνε 5 βαθιά καθίσματα (squats) κρατώντας την πλάτη σου ίσια. Πάμε!"
  ],
  default: [
    "Μοιράσου τη γνώση! Πες το σημερινό ιστορικό γεγονός σε έναν φίλο ή μέλος της οικογένειάς σου.",
    "Σχεδίασε στο τετράδιό σου ένα πολύ μικρό εικονίδιο που να ταιριάζει με το γεγονός της ημέρας.",
    "Κάνε ένα τεράστιο χαμόγελο στον επόμενο άνθρωπο που θα δεις σήμερα!",
    "Διάβασε μεγαλόφωνα μία σελίδα από το αγαπημένο σου εξωσχολικό βιβλίο.",
    "Σκέψου το πιο πετυχημένο ανέκδοτο που ξέρεις και πήγαινε να το πεις σε κάποιον.",
    "Κλείσε τα μάτια σου και μέτρα αργά μέχρι το 30 για να χαλαρώσεις το μυαλό σου.",
    "Γράψε σε ένα χαρτί 3 μικρά πράγματα για τα οποία νιώθεις χαρούμενος/η σήμερα.",
    "Φτιάξε ένα νοερό παζλ: Διάλεξε ένα αντικείμενο στο δωμάτιο και προσπάθησε να το ζωγραφίσεις από μνήμης.",
    "Κάνε ένα κομπλιμέντο, πες έναν καλό λόγο σε κάποιον συμμαθητή ή φίλο σου σήμερα.",
    "Γράψε τη σημερινή ημερομηνία στο τετράδιό σου με τα πιο περίτεχνα γράμματα που μπορείς.",
    "Αν η σημερινή μέρα είχε ένα δικό της χρώμα, ποιο θα ήταν αυτό;",
    "Κάνε 3 'high five' (έστω και στον αέρα) για να γιορτάσεις τη σημερινή μέρα!"
  ]
    },
    
    // Το έξυπνο λεξικό (keywords map) που αντικαθιστά τα ατελείωτα if-else
    keywordsMap: {
      space: ["σελήν", "διάστημ", "πλανήτ", "apollo", "τηλεσκόπιο", "δορυφόρ", "άρη", "αστρονόμ", "ήλιο"],
      tech: ["εφευρίσκει", "υπολογιστ", "apple", "ρεύμα", "λάμπα", "αυτοκίνητ", "windows", "εφεύρεσ", "μηχαν", "τηλέφων"],
      arts: ["βιβλ", "ταινία", "ζωγράφ", "μίκυ", "χάρι", "πικάσο", "σκίτσο", "συγγραφ", "μουσικ", "σινεμά"],
      exploration: ["εξερευνητ", "κολόμβος", "μαγγελάνος", "ωκεαν", "νησ", "καράβ", "ήπειρ", "διώρυγα", "ταξίδ"],
      history: ["επανάστασ", "απελευθερώνεται", "μάχ", "βασιλ", "ιστορ", "πόλεμ", "αυτοκρατορ", "σύνταγμα"],
      science: ["φυσικός", "χημικ", "νεύτων", "αϊνστάιν", "βαρύτητα", "θεωρί", "μάθημ", "στοιχείο"],
      biology: ["γιατρ", "εμβόλι", "πενικιλίνη", "φάρμακ", "ιός", "δεινόσαυρ", "φυτ", "πάστερ"],
      sports: ["αγών", "ολυμπιακ", "ποδόσφαιρ", "μπάσκετ", "αθλητ", "γυμναστικ"]
    }
  });

  // ==========================================
  // 2. UTILS & HELPERS
  // ==========================================
  const Utils = {
    // Πανέξυπνη και γρήγορη εύρεση κατηγορίας
    generateMission: (factText) => {
      const text = factText.toLowerCase();
      let category = 'default';

      for (const [key, keywords] of Object.entries(DATA.keywordsMap)) {
        if (keywords.some(kw => text.includes(kw))) {
          category = key;
          break;
        }
      }
      
      // Fallback ασφαλείας σε περίπτωση που λείπει κάτι από τη βάση
      const missionsList = DATA.dynamicMissionsPC[category] || DATA.dynamicMissionsPC['default'];
      return missionsList[Math.floor(Math.random() * missionsList.length)];
    },

    getDateKey: () => {
      const today = new Date();
      return `${today.getMonth()}-${today.getDate()}`;
    },

    // Καθαρίζει τον browser από χθεσινές/παλιές αποστολές για εξοικονόμηση χώρου
    cleanOldStorage: (currentKey) => {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CONFIG.storagePrefix) && key !== currentKey) {
          localStorage.removeItem(key);
        }
      });
    }
  };

  // ==========================================
  // 3. WIDGET MANAGER (PC VERSION)
  // ==========================================
  const WidgetManagerPC = {
    init: () => {
      const factElement = document.getElementById("history-fact-pc");
      if (!factElement) return;

      const dateKey = Utils.getDateKey();
      const currentFact = DATA.historyFactsPc[dateKey] || CONFIG.defaultFact;
      const storageKey = `${CONFIG.storagePrefix}${dateKey}`;

      // 1. Καθάρισμα παλιών δεδομένων
      Utils.cleanOldStorage(storageKey);

      // 2. Φόρτωση ή δημιουργία της σημερινής αποστολής
      const missionTextElement = document.getElementById("mission-text-pc");
      if (missionTextElement) {
        let savedMission = localStorage.getItem(storageKey);
        if (!savedMission) {
          savedMission = Utils.generateMission(currentFact);
          localStorage.setItem(storageKey, savedMission);
        }
        missionTextElement.innerHTML = savedMission;
      }

      // 3. Εμφάνιση του Ιστορικού Γεγονότος με Fade-In
      factElement.style.opacity = '0';
      factElement.innerHTML = currentFact;

      setTimeout(() => {
        window.requestAnimationFrame(() => {
          factElement.style.transition = "opacity 0.5s ease";
          factElement.style.opacity = '1';
        });
      }, CONFIG.animDelay);
    },

    // Το toggle για το κλικ στο PC
    toggleContainer: (event) => {
      if (event) event.stopPropagation();
      const container = document.getElementById("mission-container-pc");
      if (container) container.classList.toggle("open");
    },

    // Κλείσιμο όταν γίνεται click έξω από το πλαίσιο
    setupOutsideClick: () => {
      document.addEventListener("click", (event) => {
        const wrapper = document.getElementById("history-wrapper-container-pc");
        const container = document.getElementById("mission-container-pc");
        
        if (wrapper && !wrapper.contains(event.target)) {
          if (container && container.classList.contains("open")) {
            container.classList.remove("open");
          }
        }
      }, { passive: true });
    }
  };

  // ==========================================
  // 4. ΕΚΚΙΝΗΣΗ ΛΕΙΤΟΥΡΓΙΩΝ
  // ==========================================
  // Συνδέουμε το toggle με το window, ώστε να το βρίσκει το onclick="toggleMissionPC(event)" της HTML σου
  window.toggleMissionPC = WidgetManagerPC.toggleContainer;

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      WidgetManagerPC.init();
      WidgetManagerPC.setupOutsideClick();
    }, CONFIG.initDelay);
  });

})();

 (() => {
  "use strict";

  // ==========================================
  // 1. ΔΥΝΑΜΙΚΟΣ ΕΛΕΓΧΟΣ ΑΡΧΙΚΗΣ ΣΕΛΙΔΑΣ
  // ==========================================
  // Εκτελείται αμέσως, πριν καν φορτώσει το DOM, 
  // για να μην υπάρξει καθόλου οπτικό "αναβοσβήσιμο" (FOUC).
  if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    const hideStyle = document.createElement('style');
    hideStyle.innerHTML = `
      @media (min-width: 368px) and (max-width: 1000px) {
        #desktop-flip-wrapper { display: none !important; }
      }
    `;
    document.head.appendChild(hideStyle);
  }

  // ==========================================
  // 2. CONFIGURATION (Σταθερές Desktop)
  // ==========================================
  const CONFIG = Object.freeze({
    factElementId: "fact-text-desk",
    flipInnerId: "flip-inner-desk",
    flipCardId: "my-flip-card-desk",
    flippedClass: "is-flipped",
    // Το μισό του 700ms για να αλλάζει το κείμενο ακριβώς όταν η κάρτα είναι στις 90 μοίρες
    flipMidpointMs: 350 
  });

  const DATA = Object.freeze({
    // [ΒΑΛΕ ΕΔΩ ΤΙΣ ΠΛΗΡΟΦΟΡΙΕΣ ΣΟΥ ΓΙΑ ΤΟ PC]
    kidsFactsDesk: [
     "...οι μέλισσες μπορούν να «δείξουν» στις άλλες πού είναι τα λουλούδια με έναν χορό;",
    "...το χταπόδι έχει τρεις καρδιές;",
    "...τα δελφίνια επικοινωνούν με ήχους και «σφυρίγματα»;",
    "...οι αράχνες δεν είναι έντομα — είναι αραχνοειδή;",
    "...οι πεταλούδες έχουν αισθητήρες γεύσης στα πόδια τους;",
    "...οι σκύλοι ιδρώνουν κυρίως από τις πατούσες τους;",
    "...οι γάτες δεν νιώθουν τη γλυκιά γεύση όπως οι άνθρωποι;",
    "...οι ελέφαντες μπορούν να επικοινωνούν και με πολύ χαμηλούς ήχους;",
    "...οι καμηλοπαρδάλεις έχουν τον ίδιο αριθμό οστών στον λαιμό με εμάς (7);",
    "...οι πιγκουίνοι είναι πουλιά, αλλά δεν μπορούν να πετάξουν;",
    "...οι νυχτερίδες είναι τα μοναδικά θηλαστικά που πετούν πραγματικά;",
    "...τα κολιμπρί μπορούν να πετάξουν και προς τα πίσω;",
    "...οι κουκουβάγιες μπορούν να γυρίζουν πολύ το κεφάλι τους για να κοιτάζουν γύρω;",
    "...οι βάτραχοι απορροφούν νερό και από το δέρμα τους;",
    "...οι αστερίες δεν έχουν εγκέφαλο όπως εμείς;",
    "...οι μέδουσες αποτελούνται κυρίως από νερό;",
    "...οι ιππόκαμποι έχουν κάτι ξεχωριστό: ο μπαμπάς κουβαλά τα αυγά;",
    "...οι κοράλλιοι ύφαλοι χτίζονται από πάρα πολλούς μικρούς οργανισμούς μαζί;",
    "...οι κάστορες φτιάχνουν φράγματα με κλαδιά και λάσπη;",
    "...οι φάλαινες είναι θηλαστικά και αναπνέουν αέρα;",
    "...οι χελώνες έχουν κέλυφος που είναι μέρος του σκελετού τους;",
    "...οι σκαντζόχοιροι προστατεύονται με τα αγκάθια τους;",
    "...οι γορίλες ζουν σε ομάδες και φροντίζουν τα μικρά τους;",
    "...οι λύκοι «μιλούν» μεταξύ τους με ουρλιαχτά και κινήσεις του σώματος;",
    "...οι πάπιες έχουν αδιάβροχα φτερά επειδή τα λαδώνουν με ειδικό έλαιο;",
    "...τα μυρμήγκια δουλεύουν μαζί και φτιάχνουν πολύ οργανωμένες φωλιές;",
    "...οι μέλισσες είναι σημαντικές γιατί βοηθούν στην επικονίαση των φυτών;",
    "...οι καρχαρίες έχουν σκελετό από χόνδρο, όχι από κόκαλο;",
    "...τα σαλιγκάρια έχουν «κεραίες» για να αισθάνονται το περιβάλλον;",
    "...οι χήνες πετούν συχνά σε σχήμα V για να εξοικονομούν ενέργεια;",

    // ===== ΔΙΑΣΤΗΜΑ =====
    "...ο Ήλιος είναι αστέρι και δίνει φως και θερμότητα στη Γη;",
    "...το φως από τον Ήλιο χρειάζεται περίπου 8 λεπτά για να φτάσει στη Γη;",
    "...η Σελήνη είναι ο φυσικός δορυφόρος της Γης;",
    "...στη Σελήνη δεν υπάρχει αέρας όπως στη Γη;",
    "...στο διάστημα ο ήχος δεν ταξιδεύει όπως στη Γη, επειδή δεν υπάρχει αέρας;",
    "...ο Δίας είναι ο μεγαλύτερος πλανήτης του Ηλιακού Συστήματος;",
    "...ο Κρόνος είναι γνωστός για τους εντυπωσιακούς δακτυλίους του;",
    "...ο Άρης λέγεται «κόκκινος πλανήτης» λόγω της σκόνης του;",
    "...η Αφροδίτη περιστρέφεται προς την αντίθετη κατεύθυνση από πολλές άλλες πλανήτες;",
    "...η Γη κάνει μία περιστροφή γύρω από τον άξονά της σε περίπου 24 ώρες;",
    "...η Γη κάνει μία περιφορά γύρω από τον Ήλιο σε περίπου 365 ημέρες;",
    "...οι εποχές αλλάζουν επειδή ο άξονας της Γης γέρνει;",
    "...οι αστροναύτες σε τροχιά φαίνονται «χωρίς βάρος» επειδή πέφτουν συνεχώς γύρω από τη Γη;",
    "...οι μετεωρίτες είναι κομμάτια από πέτρα ή μέταλλο που φτάνουν στο έδαφος;",
    "...τα «πεφταστέρια» είναι συνήθως μικρά κομμάτια που καίγονται στην ατμόσφαιρα;",
    "...ο Γαλαξίας μας λέγεται «Γαλαξίας» ή «Milky Way»;",
    "...σε μια καθαρή νύχτα μπορείς να δεις χιλιάδες αστέρια με γυμνό μάτι;",
    "...τα τηλεσκόπια βοηθούν να βλέπουμε πολύ μακρινά αντικείμενα στο διάστημα;",
    "...οι κομήτες έχουν συχνά «ουρά» όταν πλησιάζουν τον Ήλιο;",
    "...η ατμόσφαιρα της Γης μας προστατεύει από πολλά επικίνδυνα σωματίδια;",
    "...το σέλας (βόρειο σέλας) δημιουργείται από σωματίδια που συναντούν την ατμόσφαιρα;",
    "...ο Ερμής είναι ο πιο κοντινός πλανήτης στον Ήλιο;",
    "...ο Ποσειδώνας είναι πολύ μακριά από τον Ήλιο και είναι πολύ κρύος;",
    "...οι πλανήτες δεν εκπέμπουν φως μόνοι τους — αντανακλούν το φως του Ήλιου;",
    "...οι δορυφόροι γύρω από τη Γη χρησιμοποιούνται για επικοινωνίες και πρόγνωση καιρού;",
    "...οι εκλείψεις συμβαίνουν όταν ευθυγραμμίζονται Ήλιος, Γη και Σελήνη;",
    "...η Γη είναι λίγο «πλακουτσωτή» στους πόλους της και όχι τέλεια στρογγυλή;",
    "...οι δακτύλιοι του Κρόνου αποτελούνται από πάγο και πετρώματα;",
    "...οι αστερισμοί είναι «σχήματα» που φτιάχνουμε στον ουρανό ενώνοντας αστέρια;",
    "...τα ρομπότ έχουν βοηθήσει στην εξερεύνηση πλανητών, όπως στον Άρη;",

    // ===== ΑΝΘΡΩΠΙΝΟ ΣΩΜΑ =====
    "...η καρδιά μας χτυπά περίπου 100.000 φορές την ημέρα;",
    "...το αίμα μεταφέρει οξυγόνο σε όλο μας το σώμα;",
    "...ο εγκέφαλος μας βοηθά να σκεφτόμαστε, να θυμόμαστε και να μαθαίνουμε;",
    "...τα οστά μας προστατεύουν τα όργανα και μας στηρίζουν;",
    "...τα παιδιά έχουν περισσότερα οστά από τους ενήλικες, γιατί κάποια ενώνονται μεγαλώνοντας;",
    "...οι μύες μας βοηθούν να κινούμαστε;",
    "...το δέρμα είναι το μεγαλύτερο όργανο του σώματος;",
    "...τα δόντια έχουν σμάλτο, ένα από τα πιο σκληρά υλικά στο σώμα μας;",
    "...οι πνεύμονες παίρνουν οξυγόνο από τον αέρα όταν αναπνέουμε;",
    "...η γλώσσα μας βοηθά στη γεύση και στην ομιλία;",
    "...τα μάτια μας μένουν σχεδόν στο ίδιο μέγεθος από τότε που γεννιόμαστε;",
    "...τα αυτιά βοηθούν και στην ισορροπία, όχι μόνο στην ακοή;",
    "...η μύτη μας βοηθά να μυρίζουμε και να φιλτράρουμε τον αέρα;",
    "...το στομάχι βοηθά στη διάσπαση της τροφής;",
    "...το λεπτό έντερο απορροφά πολλά θρεπτικά συστατικά από την τροφή;",
    "...το ήπαρ (συκώτι) κάνει πολλές δουλειές, όπως να επεξεργάζεται ουσίες στο αίμα;",
    "...τα νεφρά φιλτράρουν το αίμα και βοηθούν να αποβάλλουμε άχρηστες ουσίες;",
    "...ο ιδρώτας βοηθά το σώμα να δροσίζεται;",
    "...τα μαλλιά και τα νύχια αποτελούνται κυρίως από κερατίνη;",
    "...το ανοιγοκλείσιμο των ματιών προστατεύει και ενυδατώνει τα μάτια;",
    "...οι βλεφαρίδες βοηθούν να μην μπαίνει σκόνη στα μάτια;",
    "...οι άνθρωποι έχουν πέντε βασικές αισθήσεις: όραση, ακοή, όσφρηση, γεύση, αφή;",
    "...η σπονδυλική στήλη προστατεύει τον νωτιαίο μυελό;",
    "...το φτέρνισμα είναι ένας τρόπος να διώχνει το σώμα ερεθισμούς από τη μύτη;",
    "...ο λαιμός περιέχει και τον δρόμο για τον αέρα (τραχεία) και για την τροφή (οισοφάγος);",
    "...ο ύπνος βοηθά το σώμα και τον εγκέφαλο να ξεκουραστούν;",
    "...το νερό είναι πολύ σημαντικό για το σώμα μας;",
    "...οι παλμοί αυξάνονται όταν τρέχουμε ή αθλούμαστε;",
    "...τα δάχτυλά μας έχουν αποτυπώματα που είναι μοναδικά;",
    "...ο εγκέφαλος χρησιμοποιεί ενέργεια ακόμα κι όταν ξεκουραζόμαστε;",

    // ===== ΦΥΤΑ & ΦΥΣΗ =====
    "...τα φυτά φτιάχνουν την τροφή τους με τη φωτοσύνθεση χρησιμοποιώντας φως;",
    "...τα φύλλα βοηθούν το φυτό να «πιάνει» φως από τον Ήλιο;",
    "...οι ρίζες κρατούν το φυτό στο έδαφος και απορροφούν νερό;",
    "...οι σπόροι μπορούν να γίνουν νέα φυτά όταν έχουν νερό και ζέστη;",
    "...τα λουλούδια βοηθούν πολλά φυτά να φτιάξουν σπόρους;",
    "...οι μέλισσες και άλλα έντομα βοηθούν στην επικονίαση;",
    "...τα δέντρα μπορούν να δώσουν σκιά και δροσιά το καλοκαίρι;",
    "...τα δέντρα αποθηκεύουν άνθρακα στον κορμό και στα κλαδιά τους;",
    "...το νερό της βροχής μπαίνει στο έδαφος και βοηθά τα φυτά να μεγαλώνουν;",
    "...το έδαφος έχει μικρούς οργανισμούς που βοηθούν τα φυτά;",
    "...τα μανιτάρια δεν είναι φυτά — ανήκουν σε ξεχωριστή ομάδα οργανισμών;",
    "...το μπαμπού είναι ένα από τα φυτά που μεγαλώνουν πολύ γρήγορα;",
    "...τα ηλιοτρόπια μπορούν να στρέφονται προς το φως όταν είναι νεαρά;",
    "...τα πεύκα έχουν συχνά βελόνες αντί για πλατιά φύλλα;",
    "...οι βελανιδιές κάνουν βελανίδια, που είναι τροφή για πολλά ζώα;",
    "...τα κωνοφόρα δέντρα έχουν συνήθως κουκουνάρια;",
    "...ο κύκλος του νερού περιλαμβάνει εξάτμιση, σύννεφα και βροχή;",
    "...ένα σύννεφο αποτελείται από μικροσκοπικές σταγόνες νερού ή κρυστάλλους πάγου;",
    "...η ομίχλη είναι σαν σύννεφο που βρίσκεται πολύ χαμηλά, κοντά στο έδαφος;",
    "...το ουράνιο τόξο εμφανίζεται όταν το φως περνά μέσα από σταγόνες νερού;",
    "...η ανακύκλωση βοηθά να μειώνουμε τα σκουπίδια;",
    "...το χαρτί μπορεί να φτιαχτεί από ξύλο, γι’ αυτό είναι καλό να το ανακυκλώνουμε;",
    "...το γυαλί μπορεί να ανακυκλώνεται πολλές φορές;",
    "...η θάλασσα έχει αλάτι και πολλά είδη ζώων και φυτών;",
    "...τα φύκια στη θάλασσα είναι σημαντικά για πολλά θαλάσσια ζώα;",
    "...οι ερημικές περιοχές έχουν λίγη βροχή και ειδικά φυτά που αντέχουν στην ξηρασία;",
    "...τα ποτάμια μεταφέρουν νερό από τα βουνά προς τη θάλασσα;",
    "...οι καταρράκτες δημιουργούνται όταν το νερό πέφτει από ύψος;",
    "...η Γη έχει περισσότερη επιφάνεια με νερό παρά με στεριά;",
    "...τα απολιθώματα είναι ίχνη ή υπολείμματα πολύ παλιών οργανισμών που έχουν «κρατηθεί» σε πέτρα;",

    // ===== ΙΣΤΟΡΙΑ & ΤΕΧΝΟΛΟΓΙΑ =====
    "...η Πυραμίδα της Γκίζας χτίστηκε στην Αρχαία Αίγυπτο πριν από χιλιάδες χρόνια;",
    "...οι αρχαίοι Έλληνες έκαναν τους πρώτους Ολυμπιακούς Αγώνες στην Ολυμπία;",
    "...οι αρχαίοι Ολυμπιακοί Αγώνες περιλάμβαναν αθλήματα όπως το τρέξιμο;",
    "...οι χάρτες βοηθούν να βρίσκουμε μέρη στη Γη;",
    "...οι πυξίδες δείχνουν περίπου προς τον Βορρά χάρη στο μαγνητικό πεδίο της Γης;",
    "...η γραφή βοηθά τους ανθρώπους να κρατούν πληροφορίες και ιστορίες;",
    "...το αλφάβητο έχει γράμματα που αντιστοιχούν σε ήχους;",
    "...τα μουσεία φυλάσσουν αντικείμενα που μας μαθαίνουν για το παρελθόν;",
    "...οι βιβλιοθήκες συγκεντρώνουν βιβλία για να τα διαβάζουν πολλοί άνθρωποι;",
    "...ο τροχός ήταν μια από τις σημαντικές εφευρέσεις για τις μεταφορές;",
    "...τα πλοία βοηθούν στη μεταφορά ανθρώπων και πραγμάτων στη θάλασσα;",
    "...τα τρένα κινούνται πάνω σε ράγες και μπορούν να μεταφέρουν πολλούς επιβάτες;",
    "...τα αεροπλάνα πετούν χρησιμοποιώντας φτερά που δημιουργούν άνωση;",
    "...τα ποδήλατα κινούνται όταν κάνουμε πετάλι;",
    "...το πρώτο ποντίκι υπολογιστή είχε κατασκευαστεί από ξύλο;",
    "...οι υπολογιστές ακολουθούν οδηγίες που λέγονται «προγράμματα»;",
    "...το Διαδίκτυο βοηθά να στέλνουμε πληροφορίες πολύ γρήγορα;",
    "...οι δορυφόροι βοηθούν σε GPS και επικοινωνίες;",
    "...τα ρομπότ είναι μηχανές που μπορούν να κάνουν συγκεκριμένες δουλειές;",
    "...οι σεισμογράφοι είναι όργανα που μετρούν τους σεισμούς;",
    "...τα θερμόμετρα μετρούν τη θερμοκρασία;",
    "...τα μικροσκόπια βοηθούν να βλέπουμε πολύ μικρά πράγματα;",
    "...το barcode (γραμμωτός κώδικας) βοηθά τα ταμεία να αναγνωρίζουν προϊόντα;",
    "...το ποπ κορν ήταν γνωστό σε λαούς της Αμερικής εδώ και χιλιάδες χρόνια;",
    "...οι Βίκινγκς δεν φορούσαν κράνη με κέρατα — αυτό είναι μύθος από ζωγραφιές και ταινίες;",
    "...το Σινικό Τείχος της Κίνας είναι ένα από τα μεγαλύτερα ανθρώπινα έργα;",
    "...η Βενετία είναι χτισμένη πάνω σε πασσάλους μέσα στο νερό;",
    "...ο Πύργος του Άιφελ μπορεί να αλλάζει λίγο ύψος με τη ζέστη (διαστολή μετάλλου);",
    "...η ανακύκλωση ενός γυάλινου μπουκαλιού εξοικονομεί ενέργεια σε σχέση με το να φτιάξεις νέο;",
    "...οι φακοί (όπως στα γυαλιά) μπορούν να βοηθήσουν να βλέπουμε καλύτερα;",
"...ο άνθρωπος αναπνέει περίπου 20.000 φορές την ημέρα;",
"...οι καμηλοπαρδάλεις κοιμούνται συνήθως λιγότερο από 2 ώρες την ημέρα;",
"...η Γη δεν είναι τέλεια στρογγυλή αλλά λίγο πλακουτσωτή στους πόλους;",
"...οι κροκόδειλοι δεν μπορούν να βγάλουν τη γλώσσα τους έξω;",
"...τα σαλιγκάρια μπορούν να κοιμηθούν για πολύ μεγάλο διάστημα;",
"...οι πολικές αρκούδες έχουν μαύρο δέρμα κάτω από το άσπρο τρίχωμα;",
"...η σοκολάτα προέρχεται από τους καρπούς του κακαόδεντρου;",
"...οι αράχνες μπορούν να φτιάξουν μετάξι πιο δυνατό από ατσάλι στο ίδιο πάχος;",
"...ο ανθρώπινος σκελετός έχει 206 οστά όταν μεγαλώσουμε;",
"...οι φλόγες δεν έχουν πάντα το ίδιο χρώμα;",
"...οι καμηλοπαρδάλεις έχουν μπλε γλώσσα;",
"...ο Βόρειος Πόλος και ο Νότιος Πόλος δεν είναι το ίδιο μέρος;",
"...οι γλάροι μπορούν να πίνουν και θαλασσινό νερό;",
"...τα καρότα δεν ήταν πάντα πορτοκαλί;",
"...οι φράουλες έχουν τα σποράκια τους εξωτερικά;",
"...η καρδιά της γαλάζιας φάλαινας είναι τόσο μεγάλη όσο ένα μικρό αυτοκίνητο;",
"...οι παπαγάλοι μπορούν να μιμούνται ανθρώπινες φωνές;",
"...η σκιά αλλάζει μέγεθος μέσα στη μέρα;",
"...οι μέρες το καλοκαίρι είναι μεγαλύτερες από τον χειμώνα;",
"...οι πάγοι μπορούν να επιπλέουν επειδή είναι ελαφρύτεροι από το νερό;",
"...οι πλανήτες κινούνται συνεχώς γύρω από τον Ήλιο;",
"...οι μέλισσες βλέπουν και υπεριώδες φως;",
"...τα φλαμίνγκο είναι ροζ λόγω της τροφής τους;",
"...ο κεραυνός είναι πιο ζεστός από την επιφάνεια του Ήλιου για μια στιγμή;",
"...οι καμηλοπαρδάλεις έχουν μοναδικό σχέδιο στο τρίχωμά τους;",
"...οι πιγκουίνοι κάνουν πρόταση με ένα πετραδάκι;",
"...οι τίγρεις έχουν ρίγες και στο δέρμα τους;",
"...τα δελφίνια κοιμούνται με μισό εγκέφαλο κάθε φορά;",
"...η Γη έχει φυσικό μαγνητικό πεδίο;",
"...οι άνθρωποι έχουν περίπου 5 λίτρα αίμα στο σώμα τους;",
"...οι πάγοι της Ανταρκτικής είναι οι μεγαλύτεροι στον κόσμο;",
"...οι γάτες χρησιμοποιούν τα μουστάκια τους για να μετρούν χώρους;",
"...οι καρχαρίες αλλάζουν συνεχώς δόντια;",
"...οι μπανάνες είναι στην πραγματικότητα μούρα;",
"...οι κεραυνοί μπορούν να χτυπήσουν και την ίδια περιοχή δύο φορές;",
"...τα άλογα μπορούν να κοιμούνται και όρθια;",
"...οι πάγοι στους πόλους αντανακλούν το φως του Ήλιου;",
"...οι πεταλούδες ξεκινούν τη ζωή τους ως κάμπιες;",
"...οι αράχνες έχουν συνήθως οκτώ μάτια;",
"...η Σελήνη απομακρύνεται λίγο κάθε χρόνο από τη Γη;",
"...οι καμηλοπαρδάλεις μπορούν να τρέξουν πολύ γρήγορα;",
"...τα μήλα επιπλέουν στο νερό;",
"...οι φώκιες μπορούν να κρατήσουν την αναπνοή τους για πολλή ώρα;",
"...οι άνθρωποι έχουν διαφορετικές ομάδες αίματος;",
"...οι φάλαινες μπορούν να τραγουδούν;",
"...οι γάτες μπορούν να περιστρέφουν τα αυτιά τους;",
"...οι μέλισσες έχουν πέντε μάτια;",
"...ο ουρανός δεν είναι πάντα μπλε;",
"...τα κοχύλια ήταν κάποτε σπίτια ζώων;",
"...οι καμηλοπαρδάλεις γεννούν όρθιες;",
"...οι ελέφαντες δεν μπορούν να πηδήξουν;",
"...οι πάπιες έχουν βλέφαρα που κλείνουν από το πλάι;",
"...οι πιγκουίνοι γλιστρούν στην κοιλιά τους στον πάγο;",
"...οι κεραυνοί μπορεί να φανούν πριν ακουστεί ο ήχος τους;",
"...οι σκίουροι ξεχνούν πού κρύβουν μερικούς καρπούς τους;",
"...οι άνθρωποι χάνουν και βγάζουν νέα δόντια μία φορά;",
"...οι γάτες γουργουρίζουν και όταν είναι χαρούμενες;",
"...οι αράχνες δεν κολλάνε στον δικό τους ιστό;",
"...η Αυστραλία είναι και χώρα και ήπειρος;",
"...οι νυχτερίδες κρέμονται ανάποδα για να ξεκουράζονται;",
"...οι κάμπιες έχουν περισσότερα πόδια από τις πεταλούδες;",
"...οι καρχαρίες μπορούν να μυρίσουν αίμα από μακριά;",
"...τα σύννεφα μπορεί να ζυγίζουν πάρα πολύ;",
"...οι ελέφαντες χρησιμοποιούν την προβοσκίδα σαν εργαλείο;",
"...οι πάγοι λιώνουν όταν ανεβαίνει η θερμοκρασία;",
"...οι άνθρωποι έχουν περίπου 600 μύες;",
"...οι γάτες καθαρίζονται γλείφοντας το τρίχωμά τους;",
"...οι παπαγάλοι μπορούν να ζήσουν πολλά χρόνια;",
"...οι πιγκουίνοι ζουν μόνο στο νότιο ημισφαίριο;",
"...οι κεραυνοί δημιουργούν βροντή;",
"...οι καμήλες έχουν δύο σειρές βλεφαρίδες;",
"...οι άνθρωποι έχουν μοναδικό αποτύπωμα γλώσσας;",
"...οι αστερίες μπορούν να αναγεννήσουν χαμένα μέρη;",
"...οι σκύλοι έχουν πολύ πιο δυνατή όσφρηση από τους ανθρώπους;",
"...οι πλανήτες έχουν διαφορετικά μεγέθη;",
"...οι μέλισσες παράγουν μέλι από νέκταρ;",
"...οι πάπιες μπορούν να κοιμούνται με ένα μάτι ανοιχτό;",
"...οι φάλαινες είναι από τα μεγαλύτερα ζώα που έζησαν ποτέ;",
"...οι γάτες προσγειώνονται συχνά στα πόδια τους;",
"...οι καμηλοπαρδάλεις έχουν δυνατή καρδιά για να στέλνει αίμα ψηλά;",
"...οι κεραυνοί μπορούν να φωτίσουν ολόκληρο τον ουρανό;",
"...οι άνθρωποι αλλάζουν ύψος ελαφρώς μέσα στη μέρα;",
"...οι πολικές αρκούδες είναι εξαιρετικοί κολυμβητές;",
"...οι αράχνες τυλίγουν την τροφή τους με μετάξι;",
"...οι φλόγες χρειάζονται οξυγόνο για να καίνε;",
"...οι γάτες ακούν ήχους που οι άνθρωποι δεν μπορούν;",
"...οι πιγκουίνοι προστατεύουν τα αυγά τους με το σώμα τους;",
"...οι άνθρωποι έχουν περίπου 10.000 γευστικούς κάλυκες;",
"...οι καρχαρίες ζουν σε όλες σχεδόν τις θάλασσες;",
"...οι σκύλοι μπορούν να μάθουν πολλές εντολές;",
"...η βροντή είναι ο ήχος του κεραυνού;",
"...οι καμηλοπαρδάλεις πίνουν νερό ανοίγοντας πολύ τα πόδια τους;"
    ]
  });

  // ==========================================
  // 3. STATE (Μνήμη)
  // ==========================================
  const STATE = {
    shuffledFacts: [],
    currentIndex: 0,
    updateTimer: null
  };

  // ==========================================
  // 4. UTILS (Εργαλεία)
  // ==========================================
  const Utils = {
    // Ο αλγόριθμος Fisher-Yates (Ανακάτεμα "Τράπουλας")
    shuffleArray: (array) => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    
    // Ασφαλής αποκωδικοποίηση HTML Entities (όπως είχες στο αρχικό script)
    decodeHTML: (str) => {
      const txt = document.createElement("textarea");
      txt.innerHTML = str;
      return txt.value;
    }
  };

  // ==========================================
  // 5. WIDGET MANAGER (Η λογική)
  // ==========================================
  const DesktopFlipManager = {
    el: {},

    init: () => {
      DesktopFlipManager.el.fact = document.getElementById(CONFIG.factElementId);
      DesktopFlipManager.el.flipInner = document.getElementById(CONFIG.flipInnerId);
      DesktopFlipManager.el.flipCard = document.getElementById(CONFIG.flipCardId);

      // Ασφάλεια: Σταματάει χωρίς σφάλμα αν λείπουν τα HTML στοιχεία
      if (!DesktopFlipManager.el.fact || !DesktopFlipManager.el.flipInner || !DesktopFlipManager.el.flipCard) return;

      if (DATA.kidsFactsDesk.length > 0) {
        STATE.shuffledFacts = Utils.shuffleArray(DATA.kidsFactsDesk);
        STATE.currentIndex = 0;
        DesktopFlipManager.updateDOM(); // Αρχική φόρτωση χωρίς delay
      }

      DesktopFlipManager.setupEvents();
    },

    getNextFact: () => {
      if (STATE.shuffledFacts.length === 0) return "";
      
      const fact = STATE.shuffledFacts[STATE.currentIndex];
      STATE.currentIndex++;

      // Αν δείξαμε και το τελευταίο, ανακατεύουμε ξανά
      if (STATE.currentIndex >= STATE.shuffledFacts.length) {
        STATE.shuffledFacts = Utils.shuffleArray(DATA.kidsFactsDesk);
        STATE.currentIndex = 0;
      }
      return fact;
    },

    updateDOM: () => {
      const nextFact = DesktopFlipManager.getNextFact();
      if (nextFact) {
        DesktopFlipManager.el.fact.innerText = Utils.decodeHTML(nextFact);
      }
    },

    toggle: () => {
      const { flipInner } = DesktopFlipManager.el;
      const isCurrentlyFlipped = flipInner.classList.contains(CONFIG.flippedClass);
      const willBeFlipped = !isCurrentlyFlipped;

      window.requestAnimationFrame(() => {
        flipInner.classList.toggle(CONFIG.flippedClass, willBeFlipped);
        flipInner.setAttribute("aria-pressed", String(willBeFlipped));
      });

      // Αν η κάρτα ανοίγει με κλικ, αλλάζουμε το κείμενο στο τυφλό σημείο
      if (willBeFlipped) {
        setTimeout(DesktopFlipManager.updateDOM, CONFIG.flipMidpointMs);
      }
    },

    setupEvents: () => {
      const { flipInner, flipCard } = DesktopFlipManager.el;

      // ----------------------------------------
      // Mouse Leave (Για το CSS Hover effect)
      // ----------------------------------------
      flipCard.addEventListener("mouseleave", () => {
        // Αν η κάρτα κλειδώθηκε ανοιχτή με κλικ, αγνοούμε το mouseleave
        if (flipInner.classList.contains(CONFIG.flippedClass)) return;

        if (STATE.updateTimer) clearTimeout(STATE.updateTimer);

        // Αντί να περιμένει 700ms για να αλλάξει το κείμενο, 
        // τώρα το αλλάζει στις 90 μοίρες καθώς κλείνει, για να είναι έτοιμο στο επόμενο hover!
        STATE.updateTimer = setTimeout(() => {
          if (!flipInner.classList.contains(CONFIG.flippedClass)) {
            DesktopFlipManager.updateDOM();
          }
        }, CONFIG.flipMidpointMs);
      });

      // ----------------------------------------
      // Click & Keyboard (Για πλήρη προσβασιμότητα)
      // ----------------------------------------
      flipInner.addEventListener("click", DesktopFlipManager.toggle);

      flipInner.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          DesktopFlipManager.toggle();
        } else if (e.key === "Escape") {
          window.requestAnimationFrame(() => {
            flipInner.classList.remove(CONFIG.flippedClass);
            flipInner.setAttribute("aria-pressed", "false");
          });
          // Ανανεώνει το κείμενο καθώς κλείνει
          setTimeout(DesktopFlipManager.updateDOM, CONFIG.flipMidpointMs);
        }
      });
    }
  };

  // ==========================================
  // 6. ΕΚΚΙΝΗΣΗ
  // ==========================================
  document.addEventListener("DOMContentLoaded", DesktopFlipManager.init);

})();

(() => {
  "use strict";

  // ==========================================
  // 1. CONFIGURATION
  // ==========================================
  const CONFIG = Object.freeze({
    mobileBreakpoint: 768,
    glassBaseId: "riddle-glass-base",
    glassBaseClass: "widget mobile-glass-shelf",
    debounceDelay: 150 // Καθυστέρηση σε ms για βέλτιστη απόδοση στο resize
  });

  // Η δεξαμενή δεδομένων σου (Επικόλλησε εδώ τους 110 γρίφους)
  const RIDDLES_DB = [
    { q: "Έχει δόντια, αλλά δε δαγκώνει. Τι είναι;", a: "Η χτένα!" },
    { q: "Όσο περισσότερο παίρνεις από αυτό, τόσο μεγαλύτερο γίνεται. Τι είναι;", a: "Η τρύπα!" },
    { q: "Τι ανεβαίνει αλλά δεν κατεβαίνει ποτέ;", a: "Η ηλικία μας!" },
    { q: "Έχω κλειδιά αλλά δεν ανοίγω καμία πόρτα. Τι είμαι;", a: "Το πιάνο!" },
    { q: "Περπατάει χωρίς πόδια, κλαίει χωρίς μάτια. Τι είναι;", a: "Το σύννεφο!" },
    { q: "Σπάει μόλις πεις το όνομά του. Τι είναι;", a: "Η σιωπή!" },
    { q: "Ποιο πράγμα είναι δικό σου, αλλά οι άλλοι το χρησιμοποιούν περισσότερο από σένα;", a: "Το όνομά σου!" },
    { q: "Έχει λαιμό αλλά όχι κεφάλι. Τι είναι;", a: "Το μπουκάλι!" },
    { q: "Τρέχει αλλά δεν έχει πόδια. Μουρμουρίζει αλλά δεν έχει στόμα. Τι είναι;", a: "Το ποτάμι!" },
    { q: "Τι πρέπει να σπάσει πριν μπορέσεις να το χρησιμοποιήσεις;", a: "Το αυγό!" },

    // 100 Νέοι, Παιδικοί Γρίφοι
    { q: "Έχει ένα μάτι, αλλά δεν μπορεί να δει. Τι είναι;", a: "Η βελόνα!" },
    { q: "Όσο περισσότερο υπάρχει, τόσο λιγότερο βλέπεις. Τι είναι;", a: "Το σκοτάδι!" },
    { q: "Τι δεν κάνει ποτέ ερωτήσεις, αλλά απαιτεί πάντα απάντηση;", a: "Το τηλέφωνο!" },
    { q: "Ταξιδεύει σε όλο τον κόσμο μένοντας σε μια γωνία του φακέλου. Τι είναι;", a: "Το γραμματόσημο!" },
    { q: "Είμαι ψηλός όταν είμαι νέος και κοντός όταν λιώνω. Τι είμαι;", a: "Το κερί!" },
    { q: "Ποιος μήνας του χρόνου έχει 28 μέρες;", a: "Όλοι οι μήνες!" },
    { q: "Ελαφρύ σαν πούπουλο, αλλά ούτε ο πιο δυνατός δεν μπορεί να το κρατήσει για πολλή ώρα. Τι είναι;", a: "Η αναπνοή!" },
    { q: "Είναι γεμάτο τρύπες, αλλά μπορεί να κρατήσει νερό. Τι είναι;", a: "Το σφουγγάρι!" },
    { q: "Έχει τέσσερα πόδια αλλά δεν μπορεί να περπατήσει. Τι είναι;", a: "Το τραπέζι!" },
    { q: "Τι περνάει από το τζάμι χωρίς να το σπάσει;", a: "Το φως του ήλιου!" },
    { q: "Ποιο κτίριο έχει τις περισσότερες ιστορίες;", a: "Η βιβλιοθήκη!" },
    { q: "Τι έχει πόλεις χωρίς σπίτια και θάλασσες χωρίς νερό;", a: "Ο χάρτης!" },
    { q: "Βρίσκεται ακριβώς στη μέση του ουρανού. Τι είναι;", a: "Το γράμμα «Ρ»!" },
    { q: "Τι έχει δίχτυα αλλά δεν πιάνει ποτέ ψάρια;", a: "Το τέρμα του ποδοσφαίρου!" },
    { q: "Τι μπορείς να κολλήσεις (αρρωστήσεις) αλλά ποτέ να μην το πετάξεις σε κάποιον;", a: "Το κρυολόγημα!" },
    { q: "Δεν μπορείς να το δεις, αλλά κάνει τα φύλλα των δέντρων να χορεύουν. Τι είναι;", a: "Ο αέρας!" },
    { q: "Τι είναι αυτό που έχει το μέγεθος ενός ελέφαντα αλλά δε ζυγίζει τίποτα;", a: "Η σκιά του ελέφαντα!" },
    { q: "Έχει ρίζες κάτω από το χώμα, ανεβαίνει ψηλά αλλά ποτέ δεν περπατάει. Τι είναι;", a: "Το δέντρο!" },
    { q: "Έχει δείκτες (χέρια) αλλά δεν μπορεί να χτυπήσει παλαμάκια. Τι είναι;", a: "Το ρολόι!" },
    { q: "Τι μπορείς να κρατήσεις στο δεξί σου χέρι, αλλά ποτέ στο αριστερό;", a: "Το αριστερό σου χέρι!" },
    { q: "Όλοι την έχουν και κανείς δεν μπορεί να τη χάσει στον ήλιο. Τι είναι;", a: "Η σκιά!" },
    { q: "Όταν είναι καθαρός είναι μαύρος ή πράσινος, όταν τον γράφεις γίνεται λευκός. Τι είναι;", a: "Ο μαυροπίνακας!" },
    { q: "Πάνω-πάνω πάει, κάτω-κάτω πάει, μέσα στο σπίτι δεν μπαίνει. Τι είναι;", a: "Το κεραμίδι!" },
    { q: "Είμαι φτιαγμένος από νερό, αλλά αν με βάλεις στη ζέστη, θα λιώσω. Τι είμαι;", a: "Ο χιονάνθρωπος!" },
    { q: "Ξεκινάει ψηλό όταν το αγοράζεις, και γίνεται κοντό όσο το ξύνεις. Τι είναι;", a: "Το μολύβι!" },
    { q: "Έχω σελίδες και εξώφυλλο, αλλά δεν είμαι τετράδιο. Τι είμαι;", a: "Το βιβλίο διαβάσματος!" },
    { q: "Τι δε χωράει ούτε στη μεγαλύτερη κατσαρόλα του κόσμου;", a: "Το καπάκι της!" },
    { q: "Ποιο πουλί τρέχει πάρα πολύ γρήγορα αλλά δεν μπορεί να πετάξει;", a: "Η στρουθοκάμηλος!" },
    { q: "Περνάει μέσα από το νερό της λίμνης αλλά δεν βρέχεται. Τι είναι;", a: "Η σκιά του σύννεφου!" },
    { q: "Ποιο πουλί λέει το όνομά του και δεν χτίζει δική του φωλιά;", a: "Ο κούκος!" },
    { q: "Αν της δώσεις ξύλα μεγαλώνει, αν της ρίξεις νερό σβήνει. Τι είναι;", a: "Η φωτιά!" },
    { q: "Ποιο ψάρι δεν κολυμπάει ποτέ στη θάλασσα;", a: "Το ψητό ψάρι στο πιάτο!" },
    { q: "Τι πρέπει να δώσεις σε κάποιον φίλο σου για να το κρατήσεις;", a: "Μια υπόσχεση!" },
    { q: "Μπορεί να ακουστεί από μακριά, αλλά ποτέ δεν μπορείς να το πιάσεις. Τι είναι;", a: "Ο ήχος!" },
    { q: "Κρύβεται στο τέλος της λέξης «κόσμος». Τι είναι;", a: "Το γράμμα «Σ»!" },
    { q: "Είναι μαύρο πριν το ανάψεις, κόκκινο όταν καίει και γκρι όταν σβήσει. Τι είναι;", a: "Το κάρβουνο!" },
    { q: "Τι σχήμα δεν έχει ούτε αρχή, ούτε μέση, ούτε τέλος;", a: "Ο κύκλος!" },
    { q: "Έχει χαρτιά, ρήγες και βαλέδες αλλά δεν είναι παλάτι. Τι είναι;", a: "Η τράπουλα!" },
    { q: "Δεν πίνω ποτέ νερό, αλλά κάνω βόλτες πάνω στο κύμα. Τι είμαι;", a: "Το καράβι!" },
    { q: "Αν μου κάνεις γκριμάτσα, σου κάνω και εγώ. Τι είμαι;", a: "Ο καθρέφτης!" },
    { q: "Δε μιλάει από μόνη της, αλλά όταν της φωνάζεις, σου απαντάει με τα λόγια σου. Τι είναι;", a: "Η ηχώ (αντίλαλος)!" },
    { q: "Έχει πρόσωπο (κορώνα ή γράμματα) αλλά δεν έχει σώμα. Τι είναι;", a: "Το κέρμα!" },
    { q: "Ποιο ζώο κοιμάται φορώντας τα παπούτσια του (πέταλα);", a: "Το άλογο!" },
    { q: "Όσο περισσότερο σκουπίζεις τα νερά με αυτή, τόσο πιο βρεγμένη γίνεται. Τι είναι;", a: "Η πετσέτα!" },
    { q: "Τρέχει συνεχώς από τη βρύση, αλλά δεν έχει πόδια. Τι είναι;", a: "Το νερό!" },
    { q: "Είναι γλυκιά σαν μέλι, άσπρη σαν χιόνι, αλλά στο νερό εξαφανίζεται. Τι είναι;", a: "Η ζάχαρη!" },
    { q: "Πάντα κοιτάζει προς το πάτωμα και πατάει χώμα. Τι είναι;", a: "Η σόλα του παπουτσιού!" },
    { q: "Είναι πολύ εύκολο να τον βρεις, αλλά δύσκολο να ξεμπλέξεις. Τι είναι;", a: "Ο μπελάς!" },
    { q: "Έχει μέρες και μήνες, αλλά δεν είναι ρολόι. Τι είναι;", a: "Το ημερολόγιο!" },
    { q: "Πάει από σταθμό σε σταθμό, αλλά κάθεται συνέχεια στην καρέκλα του. Ποιος είναι;", a: "Ο επιβάτης στο τρένο!" },
    { q: "Είναι άσπρο και κρύο, και αν το φτιάξεις μπάλα μπορείς να παίξεις. Τι είναι;", a: "Το χιόνι!" },
    { q: "Πετάει ψηλά στον ουρανό την Καθαρά Δευτέρα, αλλά τον κρατάς από ένα σχοινάκι. Τι είναι;", a: "Ο χαρταετός!" },
    { q: "Δεν είναι δέντρο, αλλά έχει ρίζα. Βρίσκεται μέσα στο στόμα σου. Τι είναι;", a: "Το δόντι!" },
    { q: "Τι έχει «αυτιά» (χερούλια) αλλά δεν μπορεί να ακούσει τίποτα;", a: "Η κατσαρόλα!" },
    { q: "Ποιο όχημα ταξιδεύει ανάμεσα στα αστέρια;", a: "Το διαστημόπλοιο!" },
    { q: "Κουβαλάει ένα καβούκι (σπίτι) στην πλάτη του και αφήνει μια ασημένια γραμμή. Τι είναι;", a: "Το σαλιγκάρι!" },
    { q: "Ποιο λουλούδι έχει στο όνομά του ένα ζωάκι που γαβγίζει;", a: "Ο σκυλάκος!" },
    { q: "Είναι δυο αδέρφια στρόγγυλα. Ο ένας τρέχει μπροστά και ο άλλος τον κυνηγάει, αλλά δεν τον φτάνει ποτέ. Τι είναι;", a: "Οι ρόδες του ποδηλάτου!" },
    { q: "Τι έχει «μάτια» αλλά δε βλέπει; (Φυτρώνει στο χώμα)", a: "Η πατάτα!" },
    { q: "Ποιος ανεβαίνει τα σκαλιά με τρία πόδια; (Δυο δικά του και ένα ξύλινο)", a: "Ο παππούς με το μπαστούνι!" },
    { q: "Κάνει τον γύρο της αυλής αλλά στέκεται πάντα ακίνητος. Τι είναι;", a: "Ο φράχτης!" },
    { q: "Έχει κοφτερά δόντια, τρώει συνέχεια ξύλο αλλά δε χορταίνει ποτέ. Τι είναι;", a: "Το πριόνι!" },
    { q: "Αν το ρίξεις από το παράθυρο θα πετάξει, αλλά αν το ρίξεις στο νερό θα λιώσει. Τι είναι;", a: "Το χαρτί!" },
    { q: "Ποιο «σπιτάκι» στο δάσος δεν έχει ούτε πόρτες ούτε παράθυρα;", a: "Το μανιτάρι!" },
    { q: "Πότε τα παιδιά έχουν «τρία» μάτια;", a: "Όταν φορούν γυαλιά ηλίου (τα δύο δικά τους και τον ήλιο)!" },
    { q: "Ξύλινο και στρογγυλό, αν το πετάξεις μακριά, γυρίζει πίσω σε σένα. Τι είναι;", a: "Το μπούμερανγκ!" },
    { q: "Έχει έξι πλευρές και συνολικά είκοσι ένα μαύρες τελίτσες. Τι είναι;", a: "Το ζάρι του τάβλι!" },
    { q: "Περπατάει ανάποδα στο ταβάνι και δεν πέφτει ποτέ. Τι είναι;", a: "Η μύγα!" },
    { q: "Είναι ζεστός, κίτρινος και δεν μπορείς να τον πλησιάσεις γιατί θα καείς. Τι είναι;", a: "Ο ήλιος!" },
    { q: "Ποιος γράφει ασταμάτητα στο τετράδιο αλλά δεν ξέρει να διαβάζει;", a: "Το στυλό (ή το μολύβι)!" },
    { q: "Τι έχει άσπρες και μαύρες ρίγες αλλά δεν είναι διάβαση πεζών;", a: "Η ζέβρα!" },
    { q: "Είναι κίτρινη, μακριά και αρέσει πολύ στις μαϊμούδες. Τι είναι;", a: "Η μπανάνα!" },
    { q: "Τι είναι αυτό που περπατάει δίπλα σου στο φως, αλλά στο σκοτάδι χάνεται;", a: "Η σκιά σου!" },
    { q: "Είναι σκληρό και κρύο, αλλά αν το βάλεις σε ζεστό νερό λιώνει. Τι είναι;", a: "Το παγάκι!" },
    { q: "Έχει τέσσερις ρόδες, σειρήνα και τρέχει γρήγορα να βοηθήσει. Τι είναι;", a: "Το ασθενοφόρο (ή περιπολικό)!" },
    { q: "Τι είναι αυτό που το ρίχνεις στη θάλασσα όταν θέλεις να σταματήσει το πλοίο;", a: "Η άγκυρα!" },
    { q: "Αν με χάσεις, το ρολόι δεν μπορεί να με φέρει πίσω. Τι είμαι;", a: "Ο χρόνος!" },
    { q: "Πέφτουν πολλές σταγόνες από τον ουρανό αλλά καμία δεν χτυπάει. Τι είναι;", a: "Η βροχή!" },
    { q: "Είναι δικό σου, και όταν το χαρίζεις στους άλλους νιώθουν χαρά. Τι είναι;", a: "Ένα χαμόγελο!" },
    { q: "Όταν το καθαρίζεις και το κόβεις, αρχίζεις να κλαις χωρίς να πονάς. Τι είναι;", a: "Το κρεμμύδι!" },
    { q: "Μπαίνει μέσα από το τζάμι του παραθύρου και φωτίζει το δωμάτιο. Τι είναι;", a: "Η ακτίνα του ήλιου!" },
    { q: "Τι μπορείς να σπάσεις (ένα νούμερο στον αθλητισμό) και να πάρεις μετάλλιο;", a: "Το ρεκόρ!" },
    { q: "Έχει σκαλοπάτια, ανεβαίνει και κατεβαίνει, αλλά δεν φεύγει από τη θέση της. Τι είναι;", a: "Η σκάλα!" },
    { q: "Ποιο πράσινο «χορτάρι» ζει στον βυθό της θάλασσας;", a: "Τα φύκια!" },
    { q: "Ποιο μικρό ζωάκι φτιάχνει τον δικό του ιστό σαν δίχτυ;", a: "Η αράχνη!" },
    { q: "Είναι μικρή, μεταλλική και κρατάει ενωμένα τα υφάσματα. Τι είναι;", a: "Η παραμάνα!" },
    { q: "Ποιο έντομο ήταν πρώτα κάμπια και μετά έβγαλε πολύχρωμα φτερά;", a: "Η πεταλούδα!" },
    { q: "Φτιάχνει γλυκό μέλι και μένει σε κυψέλη. Τι είναι;", a: "Η μέλισσα!" },
    { q: "Είναι ο καλύτερος φίλος του ανθρώπου και κουνάει την ουρά του. Τι είναι;", a: "Ο σκύλος!" },
    { q: "Κυνηγάει τα ποντίκια και της αρέσει το γάλα. Τι είναι;", a: "Η γάτα!" },
    { q: "Έχει μάρσιπο (τσέπη) στην κοιλιά του και κάνει μεγάλα πηδήματα. Τι είναι;", a: "Το καγκουρό!" }
  ];

  // ==========================================
  // 2. DOM CACHE
  // ==========================================
  const DOM = {
    box: document.getElementById("daily-riddle-box"),
    question: document.getElementById("daily-riddle-question"),
    answer: document.getElementById("daily-riddle-answer"),
    originalLoc: document.getElementById("riddle-original-location"),
    targetWidget: document.getElementById("HTML15"),
    glassBase: null
  };

  // ==========================================
  // 3. UTILITIES
  // ==========================================
  const Utils = {
    // Αποτρέπει την υπερφόρτωση του browser κατά το window resize
    debounce: (func, delay) => {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
      };
    },
    
    // Δημιουργεί τη γυάλινη βάση δυναμικά μόνο όταν χρειαστεί
    getOrCreateGlassBase: () => {
      if (DOM.glassBase) return DOM.glassBase;
      
      const base = document.createElement("div");
      base.id = CONFIG.glassBaseId;
      base.className = CONFIG.glassBaseClass;
      base.style.cssText = "padding: 15px; margin: 15px 0;";
      DOM.glassBase = base;
      
      return base;
    }
  };

  // ==========================================
  // 4. MAIN MANAGER
  // ==========================================
  const RiddleManager = {
    init: () => {
      // Αν λείπει κάποιο βασικό στοιχείο HTML, σταματάει αθόρυβα
      if (!DOM.box || !DOM.question || !DOM.answer || RIDDLES_DB.length === 0) return;

      RiddleManager.loadDaily();
      RiddleManager.setupEvents();
      RiddleManager.handleLayout();
    },

    loadDaily: () => {
      const today = new Date();
      // Υπολογισμός τοπικής ώρας με ακρίβεια
      const localMs = today.getTime() - (today.getTimezoneOffset() * 60000);
      const daysPassed = Math.floor(localMs / 86400000); // 86400000 = ms σε μία μέρα
      
      const todaysRiddle = RIDDLES_DB[daysPassed % RIDDLES_DB.length];
      
      // Χρήση textContent αντί για innerHTML για προστασία (XSS) και ταχύτητα
      DOM.question.textContent = todaysRiddle.q;
      DOM.answer.textContent = todaysRiddle.a;
    },

    toggleBlur: () => {
      const isClear = DOM.box.classList.toggle("is-clear");
      DOM.box.setAttribute("aria-expanded", String(isClear));
    },

    handleLayout: () => {
      if (window.innerWidth <= CONFIG.mobileBreakpoint) {
        if (DOM.targetWidget) {
          const base = Utils.getOrCreateGlassBase();
          if (!base.parentNode) {
            DOM.targetWidget.after(base);
          }
          base.appendChild(DOM.box);
        }
      } else {
        if (DOM.originalLoc?.parentNode) {
          DOM.originalLoc.parentNode.insertBefore(DOM.box, DOM.originalLoc.nextSibling);
        }
        if (DOM.glassBase?.parentNode) {
          DOM.glassBase.remove();
        }
      }
    },

    setupEvents: () => {
      // Mouse/Touch Events
      DOM.box.addEventListener("click", RiddleManager.toggleBlur);
      
      // Keyboard Accessibility
      DOM.box.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          RiddleManager.toggleBlur();
        } else if (e.key === "Escape") {
          DOM.box.classList.remove("is-clear");
          DOM.box.setAttribute("aria-expanded", "false");
        }
      });

      // Window Resize (Passive listener με Debounce)
      window.addEventListener("resize", Utils.debounce(RiddleManager.handleLayout, CONFIG.debounceDelay), { passive: true });
    }
  };

  // ==========================================
  // 5. ΕΝΑΡΞΗ (BOOTSTRAP)
  // ==========================================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", RiddleManager.init);
  } else {
    RiddleManager.init();
  }

})();

(() => {
  "use strict";

  // ==========================================
  // 1. CONFIGURATION (Ρυθμίσεις Desktop)
  // ==========================================
  const CONFIG = Object.freeze({
    // Στο Desktop θέλουμε 15 βασικά άρθρα (συν 1 της εβδομάδας = 16)
    maxBasePosts: 15, 
    targetDate: new Date("2021-09-11T00:00:00Z"),
    autoSlideIntervalMs: 2000, // Αλλαγή κάθε 2 δευτερόλεπτα
    animLockMs: 500, // Κλείδωμα για spam κλικ στα βελάκια
    
    // Απευθείας URLs για τα JSON δεδομένα
    feedPopularUrl: "/feeds/posts/default/-/%CE%B4%CE%B7%CE%BC%CE%BF%CF%86%CE%B9%CE%BB%CE%AE?alt=json&max-results=15",
    feedLabelsUrl: "/feeds/posts/default/-/Διαπαιδαγώγηση|Ψυχολογία|Σχολείο|Υγεία|Παιχνίδι|Γενικά?alt=json&max-results=50",
    
    safeImage: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgdYTGP-KF_2ZHc7ykgjO533JVSDXYPsg36Oi3XC0Z6UN-yEKAhpbsK5PME3r9Q_WeAXn-c20sWAmLR65slEVQSaYaDVKLuYQtaqbjuGyH71VxJxgZqWx5vG1JSCOFlqWswSphTn6Zup1d8Uz9Ie2Tq9CQeHmWBPusLJ7rc_bPJkiau4W47iSy6cSp60N4/s800/Gemini_Generated_Image_1itzx51itzx51itz.png",
    sliderContainerId: "slider-content-desktop",
    sliderWrapperId: "custom-post-slider-desktop"
  });

  const DATA = Object.freeze({
    candidatePostsForExtraDesk: [
      { title: "Τα όρια δεν είναι φράχτες", link: "https://dimperist.blogspot.com/p/blog-page_8.html", image: "" },
      { title: "Αόρατος γονιός", link: "https://dimperist.blogspot.com/p/blog-page_1.html", image: "" },
      { title: "Πώς θα μεγαλώσουμε αυτόνομα και ανεξάρτητα παιδιά", link: "https://dimperist.blogspot.com/p/blog-page_13.html", image: "" },
      { title: "Τρόποι μείωσης της χρήσης οθονών από τα παιδιά", link: "https://dimperist.blogspot.com/p/blog-page.html", image: "" },
      { title: "10 τρόποι για να εκτιμά το παιδί τον εαυτό του", link: "https://dimperist.blogspot.com/p/10.html", image: "" },
      { title: "Τι κάνω όταν το παιδί μου θυμώνει;", link: "https://dimperist.blogspot.com/p/blog-page_86.html", image: "" },
      { title: "Παιδικές φοβίες: Αιτίες και Τρόποι Αντιμετώπισης", link: "https://dimperist.blogspot.com/p/blog-page_32.html", image: "" },
      { title: "Συναισθηματική ανάπτυξη & \"αρνητικά\" συναισθήματα", link: "https://dimperist.blogspot.com/p/blog-page_43.html", image: "" },
      { title: "Γράμμα παιδιού", link: "https://dimperist.blogspot.com/p/blog-page_71.html", image: "" },
      { title: "Το παιδί μου αντιμιλά, τι να κάνω;", link: "https://dimperist.blogspot.com/p/blog-page_98.html", image: "" },
      { title: "10 Συμβουλές για να αγαπήσουν τα «πρωτάκια» το σχολείο", link: "https://dimperist.blogspot.com/p/10_19.html", image: "" },
      { title: "Συμβουλές για καλύτερη επιστροφή στο σχολείο", link: "https://dimperist.blogspot.com/p/blog-page_19.html", image: "" },
      { title: "Οργάνωση μελέτης του παιδιού", link: "https://dimperist.blogspot.com/p/blog-page_20.html", image: "" },
      { title: "Πώς να κάνουν τα παιδιά να αγαπήσουν τα βιβλία", link: "https://dimperist.blogspot.com/p/blog-page_29.html", image: "" },
      { title: "Τι ΝΑ κάνετε και τι να ΜΗΝ κάνετε με το διάβασμα", link: "https://dimperist.blogspot.com/p/blog-page_64.html", image: "" },
      { title: "Bullying - Σχολικός Εκφοβισμός", link: "https://dimperist.blogspot.com/p/bullying.html", image: "" },
      { title: "Παιδική παχυσαρκία: Πρόληψη και σωστές διατροφικές συνήθειες", link: "https://dimperist.blogspot.com/p/blog-page_85.html", image: "" },
      { title: "Η άσκηση ως τρόπος ζωής", link: "https://dimperist.blogspot.com/2026/01/blog-post_14.html", image: "" },
      { title: "Ανακαλύψετε το σωστό άθλημα για το παιδί σας", link: "https://dimperist.blogspot.com/2026/02/blog-post_5.html", image: "" },
      { title: "Προστατεύομαι από τους σεισμούς", link: "https://dimperist.blogspot.com/p/blog-page_59.html", image: "" },
      { title: "Ενθαρρύνουμε τη δημιουργικότητα των παιδιών", link: "https://dimperist.blogspot.com/p/blog-page_41.html", image: "" },
      { title: "Η σημασία του παιχνιδιού στην ανάπτυξη", link: "https://dimperist.blogspot.com/p/blog-page_83.html", image: "" },
      { title: "Δραστηριότητες που αναπτύσσουν τις μαθησιακές δεξιότητες", link: "https://dimperist.blogspot.com/p/blog-page_56.html", image: "" }
    ]
  });

  // ==========================================
  // 2. STATE (Κατάσταση & Μνήμη)
  // ==========================================
  const STATE = {
    sliderPosts: [],
    currentIndex: 0,
    autoSlideTimer: null,
    isAnimating: false,
    touchStartX: 0
  };

  // ==========================================
  // 3. UTILITIES (Εργαλεία & Regex)
  // ==========================================
  const Utils = {
    extractMedia: (entry) => {
      let imageUrl = "";
      let isVideo = false;
      const content = entry.content ? entry.content.$t : "";

      try {
        const ytRegex = /(?:https?:)?\/\/(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
        const ytMatch = content.match(ytRegex);
        if (ytMatch && ytMatch[1]) {
          return { imageUrl: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`, isVideo: true };
        }

        const imgRegex = /<img[^>]+src="([^"]+)"/i;
        const imgMatch = content.match(imgRegex);
        if (imgMatch && imgMatch[1]) {
          imageUrl = imgMatch[1];
          if (imageUrl.includes("blogger.googleusercontent.com") || imageUrl.includes("bp.blogspot.com")) {
            imageUrl = imageUrl.replace(/\/s[0-9]+(-b|-c|-w)?\//, '/s1600/').replace(/=w[0-9]+-h[0-9]+(-c)?/, '=s1600');
          }
          return { imageUrl, isVideo: false };
        }

        if (entry.media$thumbnail && entry.media$thumbnail.url) {
          imageUrl = entry.media$thumbnail.url.replace(/\/s72-c\//, '/s1600/').replace(/=s72-c/, '=s1600');
          return { imageUrl, isVideo: false };
        }
      } catch (err) {}

      return { imageUrl: CONFIG.safeImage, isVideo: false };
    },

    getLink: (entry) => {
      const linkObj = entry.link.find(l => l.rel === "alternate");
      return linkObj ? linkObj.href : "#";
    }
  };

  // ==========================================
  // 4. API MANAGER (Ασύγχρονη Λήψη)
  // ==========================================
  const ApiManager = {
    fetchData: async () => {
      try {
        const [popularRes, labelsRes] = await Promise.all([
          fetch(CONFIG.feedPopularUrl).then(r => r.json()),
          fetch(CONFIG.feedLabelsUrl).then(r => r.json())
        ]);

        ApiManager.processPopularPosts(popularRes);
        ApiManager.processWeeklyPick(labelsRes);
        
        SliderManager.buildDOM();
      } catch (error) {
        document.getElementById(CONFIG.sliderContainerId).innerHTML = 
          "<p style='text-align:center; padding: 20px; font-family: Inter, Arial; color: #a90e0e;'>Σφάλμα φόρτωσης αναρτήσεων.</p>";
      }
    },

    processPopularPosts: (json) => {
      const entries = json.feed.entry || [];
      for (const entry of entries) {
        // Όριο τα 15 βασικά άρθρα
        if (STATE.sliderPosts.length >= CONFIG.maxBasePosts) break;
        
        const publishedDate = new Date(entry.published.$t);
        if (publishedDate >= CONFIG.targetDate) {
          const media = Utils.extractMedia(entry);
          STATE.sliderPosts.push({
            title: entry.title.$t,
            link: Utils.getLink(entry),
            image: media.imageUrl,
            isVideo: media.isVideo
          });
        }
      }
    },

    processWeeklyPick: (json) => {
      let candidates = [...DATA.candidatePostsForExtraDesk];
      const entries = json.feed.entry || [];
      entries.forEach(entry => {
        const media = Utils.extractMedia(entry);
        candidates.push({
          title: entry.title.$t,
          link: Utils.getLink(entry),
          image: media.imageUrl,
          isVideo: media.isVideo
        });
      });

      const weekNum = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
      const weeklyPick = candidates[weekNum % candidates.length];

      const weeklyPostObj = {
        title: "⭐ " + weeklyPick.title,
        link: weeklyPick.link,
        image: weeklyPick.image || CONFIG.safeImage,
        isVideo: weeklyPick.isVideo || false
      };

      // Εισαγωγή στη 16η θέση (index 15) - Διόρθωσα τον αριθμό εδώ
      const targetIndex = Math.min(15, STATE.sliderPosts.length);
      STATE.sliderPosts.splice(targetIndex, 0, weeklyPostObj);

      // Περικοπή: Κρατάμε ΑΥΣΤΗΡΑ 16 άρθρα συνολικά - Διόρθωσα τον αριθμό εδώ
      if (STATE.sliderPosts.length > 16) {
        STATE.sliderPosts = STATE.sliderPosts.slice(0, 16);
      }
    }
  };

  // ==========================================
  // 5. SLIDER MANAGER (UI & DOM)
  // ==========================================
  const SliderManager = {
    buildDOM: () => {
      const container = document.getElementById(CONFIG.sliderContainerId);
      const wrapper = document.getElementById(CONFIG.sliderWrapperId);
      if (!container || !wrapper) return;

      const arrowPrev = wrapper.querySelector('.arrow-prev');
      const arrowNext = wrapper.querySelector('.arrow-next');

      if (STATE.sliderPosts.length === 0) {
        container.innerHTML = "<p style='text-align:center; padding: 20px; font-family: Inter, Arial; color: #a90e0e;'>Δεν βρέθηκαν δημοφιλείς αναρτήσεις μετά τις 11/09/2021.</p>";
        if (arrowPrev) arrowPrev.classList.add('hidden-arrow');
        if (arrowNext) arrowNext.classList.add('hidden-arrow');
        return;
      }

      const fragment = document.createDocumentFragment();

      STATE.sliderPosts.forEach((post, index) => {
        const slide = document.createElement('div');
        slide.className = `slide-item ${index === 0 ? "active" : ""}`;
        
        const loadingAttr = index === 0 ? 'fetchpriority="high"' : 'loading="lazy"';
        const videoBadge = post.isVideo ? `<div class="video-badge">&#9654;</div>` : "";

        slide.innerHTML = `
          <a href="${post.link}" class="slide-link">
            ${videoBadge}
            <div class="slide-counter">${index + 1} / ${STATE.sliderPosts.length}</div>
            <img src="${post.image}" alt="${post.title}" ${loadingAttr}>
            <div class="slide-title-wrapper">
              <div class="slide-title">${post.title}</div>
            </div>
          </a>
        `;
        fragment.appendChild(slide);
      });

      container.innerHTML = "";
      container.appendChild(fragment);

      if (STATE.sliderPosts.length > 1) {
        if (arrowPrev) arrowPrev.classList.remove('hidden-arrow');
        if (arrowNext) arrowNext.classList.remove('hidden-arrow');
        
        SliderManager.startAutoSlide();
        SliderManager.setupEvents(wrapper, arrowPrev, arrowNext);
      } else {
        if (arrowPrev) arrowPrev.classList.add('hidden-arrow');
        if (arrowNext) arrowNext.classList.add('hidden-arrow');
      }
    },

    showSlide: (index) => {
      const slides = document.querySelectorAll(`#${CONFIG.sliderWrapperId} .slide-item`);
      if (slides.length === 0) return;

      slides.forEach(slide => slide.classList.remove("active"));

      if (index >= STATE.sliderPosts.length) STATE.currentIndex = 0;
      else if (index < 0) STATE.currentIndex = STATE.sliderPosts.length - 1;
      else STATE.currentIndex = index;

      slides[STATE.currentIndex].classList.add("active");
    },

    moveSlide: (step) => {
      if (STATE.isAnimating) return;
      STATE.isAnimating = true;

      SliderManager.showSlide(STATE.currentIndex + step);
      SliderManager.resetAutoSlide();

      setTimeout(() => { STATE.isAnimating = false; }, CONFIG.animLockMs);
    },

    startAutoSlide: () => {
      clearInterval(STATE.autoSlideTimer);
      STATE.autoSlideTimer = setInterval(() => { 
        SliderManager.moveSlide(1); 
      }, CONFIG.autoSlideIntervalMs);
    },

    resetAutoSlide: () => {
      clearInterval(STATE.autoSlideTimer);
      if (STATE.sliderPosts.length > 1) SliderManager.startAutoSlide();
    },

    setupEvents: (wrapper, arrowPrev, arrowNext) => {
      if (arrowNext) arrowNext.addEventListener("click", () => SliderManager.moveSlide(1));
      if (arrowPrev) arrowPrev.addEventListener("click", () => SliderManager.moveSlide(-1));

      wrapper.addEventListener("mouseenter", () => clearInterval(STATE.autoSlideTimer), { passive: true });
      wrapper.addEventListener("mouseleave", SliderManager.resetAutoSlide, { passive: true });
      
      wrapper.addEventListener("touchstart", (e) => {
        clearInterval(STATE.autoSlideTimer);
        STATE.touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      wrapper.addEventListener("touchend", (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const diff = STATE.touchStartX - touchEndX;
        
        if (diff > 40) SliderManager.moveSlide(1);    
        else if (diff < -40) SliderManager.moveSlide(-1); 
        
        SliderManager.resetAutoSlide();
      }, { passive: true });
    }
  };

  // ==========================================
  // 6. ΕΚΚΙΝΗΣΗ
  // ==========================================
  if (document.readyState === "loading") {
    // Αν η σελίδα ακόμα φορτώνει, περίμενε το DOMContentLoaded
    document.addEventListener("DOMContentLoaded", ApiManager.fetchData);
  } else {
    // Αν το script κατέβηκε αφού η σελίδα είχε ήδη φορτώσει, τρέξτο κατευθείαν
    ApiManager.fetchData();
  }


})();

(() => {
    "use strict";

    // ==========================================
    // 1. CONFIGURATION & DATABASE
    // ==========================================
    const CONFIG = Object.freeze({
        mobileBreakpoint: 768,
        glassBaseId: "holiday-glass-base",
        glassBaseClass: "widget mobile-glass-shelf",
        messageDelay: 7000,
        storageKey: "holidayShownMsgs"
    });

    // Η δεξαμενή με τα μηνύματα/ανέκδοτα (Επικόλλησε εδώ τη λίστα σου)
    const MESSAGES_DB = [
       "– Τοστ, γιατί χαίρεσαι;<br>– Γιατί έρχεται το καλοκαίρι και θα γίνω... ψημένο! 🥪🌞",
"– Γιατί το βιβλίο των μαθηματικών είναι πάντα λυπημένο;<br>– Επειδή έχει πολλά προβλήματα! 📘😥",
    "– Τι λέει το μηδέν στο οχτώ;<br>– Ωραία ζώνη! 0️⃣😎8️⃣",
    "– Δάσκαλε, θα με τιμωρήσετε για κάτι που δεν έκανα;<br>– Φυσικά και όχι!<br>– Ωραία, γιατί δεν έκανα τις ασκήσεις μου! 📝😇",
    "– Τι είναι κίτρινο και δεν ξέρει κολύμπι;<br>– Ένα σχολικό λεωφορείο! 🚌💦",
    "– Ποιο είναι το αγαπημένο μάθημα του φιδιού;<br>– Η Ισ-σ-σ-σ-τορία! 🐍📚",
    "– Πώς λένε έναν σκύλο που κάνει μαγικά;<br>– Χάρι Πότερ-ιερ! 🐕🪄",
    "– Γιατί οι ψαράδες είναι καλοί μαθητές;<br>– Γιατί τα πιάνουν γρήγορα! 🎣🧠",
    "– Τοστ, γιατί χαίρεσαι τόσο πολύ;<br>– Γιατί έρχεται το καλοκαίρι και θα γίνω... ψημένο! 🥪🌞",
    "– Ποιο ζώο γράφει με το δεξί χέρι;<br>– Κανένα, όλα τα ζώα γράφουν με στιλό! 🖊️🐾",
    "– Πώς σταματάς έναν αστροναύτη από το να κλάψει;<br>– Του δίνεις λίγο χώρο! 🚀🌌",
    "– Γιατί ο υπολογιστής πήγε στον γιατρό;<br>– Επειδή είχε έναν ιό! 💻🩺",
    "– Τι κάνει μια μέλισσα όταν χτενίζεται;<br>– Μελισσάκια! 🐝💇‍♀️",
    "– Πού πάνε τα μολύβια για διακοπές;<br>– Στην Πενσυλβάνια! ✏️🎒",
    "– Πώς λέγεται το έξυπνο ψάρι;<br>– Ξιφίας! 🐟🧠",
    "– Γιατί οι γάτες είναι καλές στα βιντεοπαιχνίδια;<br>– Επειδή έχουν εννιά ζωές! 🐈🎮",
    "– Τι λέει ένας τοίχος σε έναν άλλο τοίχο;<br>– Τα λέμε στη γωνία! 🧱😆",
    "– Ποιο μουσικό όργανο βρίσκεται στο μπάνιο;<br>– Η οδοντόβουρτσα! 🪥🎵",
    "– Γιε μου, πώς τα πήγες στο διαγώνισμα Ιστορίας;<br>– Μια χαρά! Απλώς ο δάσκαλος διαφωνούσε με αυτά που έγραψα! 📜🤷‍♂️",
    "– Τι κάνει ένας πειρατής όταν δεν ξέρει την απάντηση;<br>– Λέει... Αρρρρρρ-γνοώ! 🏴‍☠️🤔",
    "– Ποιο είναι το αγαπημένο χρώμα της γάτας;<br>– Το νιαούρο! 🐈⬛🎨",
    "– Ποιο είναι το πιο γρήγορο ζώο στο σχολείο;<br>– Ο γατόπαρδος... όταν χτυπάει το κουδούνι! 🐆🔔",
    "– Τι λέει ένα βουνό σε ένα άλλο βουνό;<br>– Πώς πάνε τα ύψη; ⛰️🏔️",
    "– Γιατί ο ήλιος δεν πάει ποτέ στο πανεπιστήμιο;<br>– Επειδή έχει ήδη ένα εκατομμύριο μοίρες! ☀️🎓",
    "– Πώς λένε έναν χιονάνθρωπο το καλοκαίρι;<br>– Νερόλακκο! ⛄💧",
    "– Τι είπε το αριστερό μάτι στο δεξί;<br>– Ανάμεσά μας, κάτι μυρίζει! 👃👀",
    "– Γιατί ο Τοτός πήρε μια σκάλα στο σχολείο;<br>– Γιατί ήθελε να πάει στην... ανώτερη εκπαίδευση! 🪜🏫",
    "– Τι είναι άσπρο, μαύρο και διαβάζεται παντού;<br>– Μια εφημερίδα! 📰🦓",
    "– Ποιο δωμάτιο δεν έχει πόρτες και παράθυρα;<br>– Το μανιτάρι! 🍄🏠",
    "– Γιατί η ντομάτα έγινε κόκκινη;<br>– Επειδή είδε τη σαλάτα να ντύνεται! 🍅🥗",
    "– Πώς φωνάζουμε έναν σκύλο στην παραλία;<br>– Με το όνομά του! 🏖️🐶",
    "– Ποιο έντομο είναι το καλύτερο στο κρυφτό;<br>– Η καμπια... γιατί γίνεται πεταλούδα και πετάει μακριά! 🐛🦋",
    "– Πώς επικοινωνούν τα ψάρια;<br>– Με... ιχθυο-μηνύματα! 🐠📱",
    "– Τι τρώει ο βάτραχος όταν κάνει δίαιτα;<br>– Μύγες... διαίτης! 🐸🦟",
    "– Γιατί η θάλασσα είναι αλμυρή;<br>– Γιατί έχει πολλά κύματα και ιδρώνει! 🌊😅",
    "– Τι είναι μικρό, πράσινο και πάει πάνω-κάτω;<br>– Ένα αγγούρι στο ασανσέρ! 🥒🛗",
    "– Τι λέει ένα σύννεφο όταν βρέχει;<br>– Συγγνώμη, μου ξέφυγε! ☁️☔",
    "– Γιατί το ποδήλατο δεν μπορούσε να σταθεί όρθιο;<br>– Επειδή ήταν πολύ κουρασμένο! 🚲😴",
    "– Τι είναι γεμάτο τρύπες αλλά κρατάει νερό;<br>– Το σφουγγάρι! 🧽💦",
    "– Ποιο φρούτο είναι το πιο αυστηρό;<br>– Το ακτινίδιο... γιατί έχει ακτίνες! 🥝🔦",
    "– Γιατί το μολύβι δεν μιλάει;<br>– Επειδή φοβάται μη χάσει τη μύτη του! ✏️🙊",
    "– Τι λέει ο ένας μαγνήτης στον άλλο;<br>– Με τραβάς πολύ! 🧲❤️",
    "– Πώς λέγεται η χελώνα που τρέχει γρήγορα;<br>– Χελώνα-νίντζα! 🐢🥷",
    "– Γιατί τα ρολόγια είναι τόσο έξυπνα;<br>– Γιατί έχουν όλους τους αριθμούς! ⏰🔢",
    "– Πώς λένε έναν γάτο που πίνει πολύ γάλα;<br>– Γαλατά! 🥛🐱",
    "– Τι βάζεις στο κρεβάτι σου για να κάνεις γλυκά όνειρα;<br>– Ζάχαρη! 🛏️🍬",
    "– Ποιο είναι το αγαπημένο φαγητό των φαντασμάτων;<br>– Τα μακαρόνια με κιμά... μπου! 👻🍝",
    "– Τι είπε ο αριθμός 1 στον 2;<br>– Είμαστε αχώριστοι! 1️⃣🤝2️⃣",
    "– Πώς βρίσκει ένα τυφλό μυρμήγκι τον δρόμο του;<br>– Δεν τον βρίσκει, μυρμήγκι είναι! 🐜🤷‍♂️",
    "– Τι είναι κίτρινο και μυρίζει σαν πράσινη μπογιά;<br>– Η κίτρινη μπογιά! 🎨😂",
    "– Πώς λέγεται το παπούτσι του χταποδιού;<br>– Χταποδοπάπουτσο! 🐙👟",
    "– Γιατί ο Τοτός έβαλε τον υπολογιστή του στο ψυγείο;<br>– Για να σερφάρει πιο... κουλ! 💻❄️",
    "– Τι είναι διαφανές και μυρίζει καρότο;<br>– Ένα ρέψιμο λαγού! 🐇🥕",
    "– Ποιος μήνας έχει 28 μέρες;<br>– Όλοι οι μήνες! 📅😆",
    "– Γιατί τα δέντρα είναι καλά στο διαδίκτυο;<br>– Επειδή ξέρουν να κάνουν log in! 🌳💻",
    "– Ποιο είναι το πιο καθαρό ζώο;<br>– Το σφουγγάρι της θάλασσας! 🧧🐠",
    "– Τι κάνουν οι αγελάδες όταν έχουν ελεύθερο χρόνο;<br>– Πάνε σινεμού-ου-ου! 🐄🍿",
    "– Ποιο δέντρο χωράει στο χέρι μας;<br>– Το φοινικόδεντρο! 🌴✋",
    "– Γιατί ο δάσκαλος φορούσε γυαλιά ηλίου στην τάξη;<br>– Επειδή οι μαθητές του ήταν πολύ... λαμπροί! 😎✨",
    "– Τι είναι πιο βαρύ, ένα κιλό σίδερο ή ένα κιλό πούπουλα;<br>– Το ίδιο είναι! 🪶⚖️🪨",
    "– Πώς περνάνε τα χελιδόνια τις εξετάσεις;<br>– Πετώντας! 🐦📝",
    "– Τι είπε ο πλανήτης Γη στον πλανήτη Άρη;<br>– Έχεις πολύ εξωγήινη ομορφιά! 🌍🪐",
    "– Τι ρούχα φοράνε τα φαντάσματα;<br>– Μπού-φαν! 👻🧥",
    "– Ποιος βασιλιάς δεν φοράει ποτέ στέμμα;<br>– Ο βασιλιάς των λιονταριών! 🦁👑",
    "– Γιατί το βιβλίο της Γεωγραφίας είναι κουρασμένο;<br>– Επειδή έχει κάνει τον γύρο του κόσμου! 🗺️🥵",
    "– Τι τρώνε οι υπολογιστές για πρωινό;<br>– Μικρο-τσιπς! 🖥️🍟",
    "– Τι είναι μικρό, γλυκό και πάει στο διάστημα;<br>– Ένα αστροναυτάκι-ζαχαρωτό! 🍬🚀",
    "– Πώς λέγεται η κότα που λέει αστεία;<br>– Κοτο-κωμικός! 🐔😂",
    "– Τι κάνει ένας εξωγήινος στο σχολείο;<br>– Διαστημικές εργασίες! 👽📚",
    "– Γιατί τα μπαλόνια μισούν τη μουσική ποπ;<br>– Γιατί φοβούνται το ΠΟΠ! 🎈💥",
    "– Τι είπε το πινέλο στον καμβά;<br>– Έχουμε δημιουργήσει ένα αριστούργημα! 🖌️🖼️",
    "– Πώς χαιρετιούνται τα δέντρα;<br>– Με φύλλα! 🌳👋",
    "– Τι κάνει ο Τοτός όταν κάνει κρύο;<br>– Στέκεται στη γωνία, που έχει 90 μοίρες! 📐🥶",
    "– Ποιο πουλί είναι συνέχεια στο κομπιούτερ;<br>– Ο παπαγάλος... κάνει συνέχεια copy-paste! 🦜⌨️",
    "– Τι έχει 100 πόδια και δεν περπατάει;<br>– 50 παντελόνια! 👖🤣",
    "– Τι είναι κίτρινο, έχει ρόδες και δεν είναι αυτοκίνητο;<br>– Μια μπανάνα με πατίνια! 🍌🛼",

    // === ΜΗΝΥΜΑΤΑ & ΕΝΘΑΡΡΥΝΣΗ (75) ===
    "Κουράγιο, βγαίνει η χρονιά! Κάνε τα μαθήματά σου γρήγορα σήμερα... η ξεκούραση πλησιάζει! 💪",
    "Κάθε λάθος είναι απλώς μια απόδειξη ότι προσπαθείς! Μην τα παρατάς! 🌟",
    "Το χαμόγελό σου μπορεί να φωτίσει ολόκληρη την τάξη. Χαμογέλα! 😊",
    "Είσαι πιο έξυπνος από όσο νομίζεις και πιο δυνατός από όσο φαντάζεσαι! 🦸‍♂️🦸‍♀️",
    "Ένα βιβλίο την ημέρα... κάνει τη φαντασία να πετάει ψηλά! 📖🚀",
    "Η συνεργασία στην ομάδα κάνει το μάθημα παιχνίδι! Βοήθησε έναν συμμαθητή σου σήμερα. 🤝",
    "Οι δυσκολίες στα μαθηματικά λύνονται με υπομονή και λίγο... μολύβι! ✏️🧠",
    "Μην ξεχνάς: Σήμερα είναι μια τέλεια μέρα για να μάθεις κάτι καινούργιο! ☀️📚",
    "Η ευγένεια δεν κοστίζει τίποτα, αλλά κάνει τους πάντες χαρούμενους! 💖",
    "Όταν διαβάζεις, ταξιδεύεις χωρίς να κουνηθείς από το θρανίο σου! 🌍🎒",
    "Κάθε μέρα που προσπαθείς, γίνεσαι λίγο καλύτερος από χθες! 📈🏆",
    "Η τεχνολογία είναι υπέροχη, αλλά το παιχνίδι στο διάλειμμα είναι ακόμα καλύτερο! ⚽🏃‍♂️",
    "Πάρε μια βαθιά ανάσα! Ακόμα και τα πιο δύσκολα προβλήματα έχουν λύση. 🧘‍♀️✅",
    "Σέβασου το περιβάλλον του σχολείου, είναι το δεύτερο σπίτι σου! 🏫🌳",
    "Δεν πειράζει αν δεν τα καταφέρεις με την πρώτη. Δοκίμασε ξανά! 🔄👍",
    "Η φαντασία σου είναι το μεγαλύτερο σου ταλέντο. Χρησιμοποίησέ την! 🎨✨",
    "Τα βιβλία είναι σαν καθρέφτες: Αν τα ανοίξεις, βλέπεις νέους κόσμους! 🪞📖",
    "Μια καλή πράξη σήμερα μπορεί να αλλάξει τη μέρα κάποιου. Γίνε εσύ ο λόγος! 🎁🥰",
    "Ο επιμένων νικά! Συνέχισε το διάβασμα και θα δεις αποτελέσματα! 🏅📚",
    "Το σχολείο είναι σαν κήπος. Όσο πιο πολύ το φροντίζουμε, τόσο πιο όμορφο γίνεται! 🌷🏫",
    "Δώσε τον καλύτερό σου εαυτό σε ό,τι κι αν κάνεις, από την ορθογραφία μέχρι τη γυμναστική! 💯🏃‍♀️",
    "Οι σπουδαιότερες εφευρέσεις ξεκίνησαν από μια απλή απορία στην τάξη. Ρώτα ελεύθερα! 🙋‍♂️💡",
    "Διάλειμμα σημαίνει παιχνίδι, γέλιο και φιλίες. Απόλαυσέ το! 🎈😄",
    "Η καθαρή τσάντα και το τακτοποιημένο θρανίο φέρνουν... καθαρό μυαλό! 🎒✨",
    "Μην συγκρίνεις τον εαυτό σου με άλλους. Ο καθένας μαθαίνει με τον δικό του ρυθμό! 🐢🐇",
    "Άκουσε με προσοχή όταν μιλούν οι άλλοι, έχεις πολλά να μάθεις. 👂🎓",
    "Το διάβασμα δεν είναι υποχρέωση, είναι το εισιτήριό σου για το μέλλον! 🎫🚀",
    "Η επιτυχία είναι 1% ταλέντο και 99% προσπάθεια. Βάλε τα δυνατά σου! 💧💪",
    "Μπορείς να καταφέρεις τα πάντα, αρκεί να το πιστέψεις. 🌠❤️",
    "Όταν συνεργαζόμαστε, δημιουργούμε αριστουργήματα. Ομαδική δουλειά! 🧩🤝",
    "Τα Χριστούγεννα και το Πάσχα είναι γιορτές αγάπης. Δείξε αγάπη κάθε μέρα! 🎄🐣",
    "Αν νιώθεις κούραση, σκέψου πόσο κοντά είσαι στον στόχο σου! 🏁👟",
    "Γίνε ο ήρωας του δικού σου παραμυθιού. Γράψε τη δική σου ιστορία! ✍️🏰",
    "Μαθηματικά, Ιστορία, Γλώσσα... Κάθε μάθημα είναι ένα κομμάτι του παζλ! 🧩📚",
    "Τα λόγια έχουν δύναμη. Χρησιμοποίησέ τα για να δώσεις χαρά στους συμμαθητές σου! 🗣️😊",
    "Ανακάλυψε τον κόσμο γύρω σου. Η επιστήμη βρίσκεται παντού! 🔬🌍",
    "Η φύση είναι η καλύτερη δασκάλα. Βγες έξω και παρατήρησέ την! 🌲🐛",
    "Μην φοβάσαι να κάνεις ερωτήσεις. Αυτός είναι ο τρόπος για να μάθεις! ❓💡",
    "Ένα «ευχαριστώ» και ένα «παρακαλώ» είναι τα κλειδιά της ευγένειας. 🗝️💖",
    "Κάθε πρωί που ξυπνάς, ξεκινάει μια νέα περιπέτεια στο σχολείο! 🌅🎒",
    "Οι πραγματικοί φίλοι σε υποστηρίζουν στα δύσκολα διαγωνίσματα. 👫📝",
    "Η γυμναστική δίνει ενέργεια στο σώμα και στο μυαλό. Κουνήσου! 🤸‍♂️🔋",
    "Ζωγράφισε τα όνειρά σου με τα πιο φωτεινά χρώματα! 🖍️🌈",
    "Το μέλλον ανήκει σε αυτούς που διαβάζουν βιβλία σήμερα. 🔮📖",
    "Δείξε σεβασμό στους δασκάλους σου, είναι οι οδηγοί σου στη γνώση. 👨‍🏫🧭",
    "Όλοι κάνουμε λάθη. Το μυστικό είναι να μαθαίνουμε από αυτά! 🔓🧠",
    "Μοιράσου τις ιδέες σου με την τάξη, ίσως είναι η λύση που όλοι έψαχναν! 🗣️💡",
    "Ένα καθαρό περιβάλλον ξεκινάει από τον κάδο ανακύκλωσης της τάξης μας! ♻️🌍",
    "Δεν υπάρχει «δεν μπορώ», υπάρχει μόνο «δεν μπορώ ακόμα». Δώσε χρόνο! ⏳💪",
    "Κάνε μια ευχή και προσπάθησε σκληρά για να την κάνεις πραγματικότητα! 🌠🛠️",
    "Η υπομονή είναι αρετή. Περίμενε τη σειρά σου και όλα θα γίνουν. 🐢👍",
    "Βρες χρόνο να χαλαρώνεις, είναι εξίσου σημαντικό με το διάβασμα. 🛋️🎶",
    "Το γέλιο είναι το καλύτερο φάρμακο, ειδικά στα διαλείμματα! 😂💊",
    "Αγάπησε τον εαυτό σου ακριβώς όπως είσαι, είσαι μοναδικός! ❤️🌟",
    "Όταν βοηθάς έναν συμμαθητή σου, βοηθάς και τον εαυτό σου να γίνει καλύτερος. 🤗🤝",
    "Τα μυστικά του σύμπαντος κρύβονται μέσα στα βιβλία της επιστήμης. 🔭🌌",
    "Μια ζεστή «καλημέρα» μπορεί να φτιάξει τη διάθεση όλης της τάξης! ☀️👋",
    "Κάθε πρόβλημα μαθηματικών είναι ένας γρίφος που περιμένει να λυθεί. Λύσε τον! 🧩🔍",
    "Η μουσική ομορφαίνει τη ζωή. Τραγούδα τα αγαπημένα σου τραγούδια! 🎵🎤",
    "Μην αφήνεις για αύριο αυτό που μπορείς να διαβάσεις σήμερα. ⏳📖",
    "Η καλύτερη προετοιμασία για αύριο είναι να κάνεις το καλύτερο σήμερα. 🎯📅",
    "Κάθε συμμαθητής σου κρύβει ένα ταλέντο. Βοήθησέ τον να το ανακαλύψει! 🎁👀",
    "Το σχολείο μας είναι μια μεγάλη οικογένεια. Προστατεύουμε ο ένας τον άλλον. 🏫👪",
    "Η ειλικρίνεια είναι το πιο όμορφο στολίδι του χαρακτήρα σου. 💎🗣️",
    "Φρόντισε το σώμα σου με υγιεινό κολατσιό και μπόλικο νερό! 🍎💧",
    "Κάθε μάθημα είναι μια νέα πτήση προς τη γνώση. Δέστε τις ζώνες σας! ✈️🧠",
    "Μην τα παρατάς! Η θέα από την κορυφή είναι φανταστική. ⛰️🤩",
    "Οι αριθμοί λένε την αλήθεια, αρκεί να ξέρεις να τους διαβάζεις. 🔢📊",
    "Σκέψου θετικά, δούλεψε σκληρά, και τα αποτελέσματα θα έρθουν! ✨🔨",
    "Η ελευθερία έρχεται με την υπευθυνότητα. Κάνε σωστές επιλογές! 🕊️⚖️",
    "Μια μικρή ιστορία πριν τον ύπνο φέρνει τα πιο γλυκά όνειρα. 🛌📖",
    "Η τέχνη δεν έχει κανόνες, μόνο φαντασία. Ζωγράφισε ελεύθερα! 🎨🖌️",
    "Σήκωσε το χέρι σου, πες τη γνώμη σου, η φωνή σου μετράει! 🙋‍♀️🔊",
    "Αγκάλιασε τη διαφορετικότητα, κάνει τον κόσμο μας πιο πολύχρωμο! 🌍🌈",
    "Μείνε προσηλωμένος στον στόχο σου. Οι διακοπές είναι η ανταμοιβή σου! 🏖️🏆",
        "Κουράγιο, βγαίνει η χρονιά! Κάνε τα μαθήματά σου γρήγορα σήμερα... η ξεκούραση πλησιάζει! 💪"
    ];

    // ==========================================
    // 2. DOM CACHE (Αποθήκευση στοιχείων για ταχύτητα)
    // ==========================================
    const DOM = {
        widgetBox: document.getElementById('holiday-widget-box'),
        mainContent: document.getElementById('holiday-main-content'),
        secretBox: document.getElementById('holiday-secret-message'),
        display: document.getElementById('h-countdown'),
        icon: document.getElementById('h-icon'),
        batFill: document.getElementById('bat-fill'),
        batText: document.getElementById('bat-text'),
        originalLoc: document.getElementById("holiday-original-location"),
        glassBase: null
    };

    // ==========================================
    // 3. UTILITIES (Βοηθητικές Συναρτήσεις)
    // ==========================================
    const Utils = {
        debounce: (func, delay) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), delay);
            };
        },
        // Μαθηματικός υπολογισμός Ορθόδοξου Πάσχα
        getOrthodoxEaster: (year) => {
            const a = year % 19, b = year % 4, c = year % 7;
            const d = (19 * a + 15) % 30;
            const e = (2 * b + 4 * c + 6 * d + 6) % 7;
            let date = new Date(year, 2, 22);
            date.setDate(date.getDate() + (d + e + 13));
            return date;
        },
        // Υπολογίζει ποια μέρα του έτους (1-365/366) είναι μια ημερομηνία
        getDayOfYear: (dateObj) => {
            const start = new Date(dateObj.getFullYear(), 0, 0);
            const diff = dateObj - start + (start.getTimezoneOffset() - dateObj.getTimezoneOffset()) * 60000;
            return Math.floor(diff / (1000 * 60 * 60 * 24));
        }
    };

    // ==========================================
    // 4. HOLIDAY & BATTERY ENGINES
    // ==========================================
    const CoreEngine = {
        update: () => {
            if (!DOM.display || !DOM.icon) return;

            const now = new Date();
            const year = now.getFullYear();

            // Ημερομηνίες Ορόσημα
            let easterDate = Utils.getOrthodoxEaster(year);
            let easterStart = new Date(easterDate);
            easterStart.setDate(easterDate.getDate() - 8);
            easterStart.setHours(0, 0, 0);
            let easterEnd = new Date(easterStart);
            easterEnd.setDate(easterStart.getDate() + 16);

            let summerStart = new Date(year, 5, 16, 0, 0, 0); // 16 Ιουνίου
            let summerEnd = new Date(year, 8, 10, 23, 59, 59); // 10 Σεπτεμβρίου

            let xmasStart = new Date(year, 11, 24, 0, 0, 0); // 24 Δεκ
            let xmasEnd = new Date(year + (now.getMonth() === 0 ? 0 : 1), 0, 7, 23, 59, 59); // 7 Ιαν
            if (now.getMonth() === 0 && now.getDate() <= 7) {
                xmasStart = new Date(year - 1, 11, 23, 0, 0, 0);
            }

            // Έλεγχος αν είμαστε ΗΔΗ σε διακοπές
            if ((now >= summerStart && now <= summerEnd) || 
                (now >= xmasStart && now <= xmasEnd) || 
                (now >= easterStart && now <= easterEnd)) {
                
                DOM.icon.innerHTML = "&#10024;"; 
                DOM.display.innerHTML = '<span class="holiday-days">Καλές διακοπές!</span>';
                CoreEngine.updateBattery(now, true, easterStart); 
                return;
            }

            // Υπολογισμός Επόμενης Γιορτής
            let targets = [
                { name: "για τις διακοπές του Πάσχα 🐣", date: easterStart, icon: "🐣" },
                { name: "για το Καλοκαίρι 🏝️", date: summerStart, icon: "🏝️" }, 
                { name: "για τα Χριστούγεννα 🎄", date: xmasStart, icon: "🎄" }
            ].sort((a, b) => a.date - b.date);

            let next = targets.find(t => t.date > now);
            if (!next) {
                let nextEaster = Utils.getOrthodoxEaster(year + 1);
                nextEaster.setDate(nextEaster.getDate() - 9);
                next = { name: "για το Πάσχα 🐣", date: nextEaster, icon: "🐣" };
            }

            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const targetDate = new Date(next.date.getFullYear(), next.date.getMonth(), next.date.getDate());
            const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));

            DOM.icon.innerHTML = next.icon;
            DOM.display.innerHTML = `<span class="holiday-days">Μένουν ${diffDays} ημέρες</span> ${next.name}`;

            CoreEngine.updateBattery(now, false, easterStart);
        },

        updateBattery: (now, isHoliday, easterStart) => {
            if (!DOM.batFill || !DOM.batText) return;

            const dayOfYear = Utils.getDayOfYear(now);
            const easterStartDay = Utils.getDayOfYear(easterStart); // Δυναμικός υπολογισμός!
            let batLevel = 50;

            const m = now.getMonth() + 1;
            const d = now.getDate();
            const isEaster = (now >= easterStart && now <= new Date(easterStart).setDate(easterStart.getDate() + 16));
            const isSummer = (m >= 6 && d >= 16) || (m >= 7 && m <= 8) || (m === 9 && d <= 10);
            const isXmas = (m === 12 && d >= 23) || (m === 1 && d <= 7);

            // Λογική Φόρτισης/Εκφόρτισης
            if (isSummer) {
                let summerStartDay = Utils.getDayOfYear(new Date(now.getFullYear(), 5, 16));
                let summerDays = dayOfYear - summerStartDay; 
                batLevel = 5 + (summerDays * 1.31); 
            } 
            else if (isXmas) {
                let xmasDay = (dayOfYear >= 357) ? (dayOfYear - 356) : (dayOfYear + 9);
                batLevel = 50 + (xmasDay * 1.87); 
            } 
            else if (isEaster) {
                let easterDay = dayOfYear - easterStartDay + 1;
                batLevel = 40 + (easterDay * 1.87);
            } 
            else {
                // Περίοδος Σχολείου
                if (dayOfYear >= 244 && dayOfYear <= 356) {
                    batLevel = 100 - ((dayOfYear - 243) * 0.47);
                } 
                else if (dayOfYear >= 8 && dayOfYear < easterStartDay) {
                    batLevel = 80 - ((dayOfYear - 7) * 0.37);
                } 
                else {
                    let daysAfterEaster = dayOfYear - (easterStartDay + 15);
                    batLevel = 70 - (daysAfterEaster * 1.85); 
                }
            }

            batLevel = Math.max(5, Math.min(100, Math.round(batLevel)));

            // Εφαρμογή Στυλ
            DOM.batFill.style.width = batLevel + '%';
            DOM.batText.innerHTML = `Μπαταρία Δασκάλων: ${batLevel}% ${isHoliday ? '<span class="charging-icon">⚡</span>' : ''}`;
            
            if (batLevel <= 20) {
                DOM.batFill.style.background = ''; 
                DOM.batFill.style.boxShadow = 'none';
                DOM.batFill.classList.add('battery-low-alert');
            } else {
                DOM.batFill.classList.remove('battery-low-alert');
                if (batLevel <= 50) {
                    DOM.batFill.style.background = 'linear-gradient(90deg, #f6d365 0%, #fda085 100%)'; 
                    DOM.batFill.style.boxShadow = '0 0 10px rgba(246, 211, 101, 0.5)';
                } else {
                    DOM.batFill.style.background = 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)'; 
                    DOM.batFill.style.boxShadow = '0 0 10px rgba(67, 233, 123, 0.5)';
                }
            }
        }
    };

    // ==========================================
    // 5. MESSAGE MANAGER (Easter Eggs)
    // ==========================================
    const MessageManager = {
        isShowing: false,
        timeout: null,

        show: (e) => {
            e.stopPropagation(); 
            if (MessageManager.isShowing || MESSAGES_DB.length === 0) return;
            
            MessageManager.isShowing = true;
            DOM.mainContent.style.display = 'none';
            DOM.secretBox.style.display = 'block';
            
            let shown = JSON.parse(sessionStorage.getItem(CONFIG.storageKey)) || [];
            if (shown.length >= MESSAGES_DB.length) shown = []; // Reset αν τα είδε όλα
            
            let available = Array.from({length: MESSAGES_DB.length}, (_, i) => i).filter(i => !shown.includes(i));
            const randomIdx = available[Math.floor(Math.random() * available.length)];
            
            shown.push(randomIdx);
            sessionStorage.setItem(CONFIG.storageKey, JSON.stringify(shown));
            
            DOM.secretBox.innerHTML = MESSAGES_DB[randomIdx];

            clearTimeout(MessageManager.timeout);
            MessageManager.timeout = setTimeout(MessageManager.hide, CONFIG.messageDelay);
        },

        hide: () => {
            if (!MessageManager.isShowing) return;
            clearTimeout(MessageManager.timeout);
            DOM.secretBox.style.display = 'none';
            DOM.mainContent.style.display = 'block';
            MessageManager.isShowing = false;
        }
    };

    // ==========================================
    // 6. LAYOUT MANAGER (Responsive Move)
    // ==========================================
    const LayoutManager = {
        getOrCreateGlassBase: () => {
            if (DOM.glassBase) return DOM.glassBase;
            const base = document.createElement("div");
            base.id = CONFIG.glassBaseId;
            base.className = CONFIG.glassBaseClass;
            DOM.glassBase = base;
            return base;
        },

        moveWidget: () => {
            if (!DOM.widgetBox) return;

            if (window.innerWidth <= CONFIG.mobileBreakpoint) {
                // Ψάχνει το HTML 17 (του γρίφου) για να κάτσει από κάτω του
                let targetWidget = document.getElementById("riddle-glass-base") || document.getElementById("HTML17");
                if (targetWidget) {
                    const base = LayoutManager.getOrCreateGlassBase();
                    targetWidget.after(base);
                    base.appendChild(DOM.widgetBox);
                }
            } else {
                if (DOM.originalLoc?.parentNode) {
                    DOM.originalLoc.parentNode.insertBefore(DOM.widgetBox, DOM.originalLoc.nextSibling);
                }
                if (DOM.glassBase?.parentNode) {
                    DOM.glassBase.remove();
                }
            }
        }
    };

    // ==========================================
    // 7. BOOTSTRAP (Εκκίνηση)
    // ==========================================
    const App = {
        init: () => {
            if (!DOM.widgetBox) return;

            // 1. Υπολογισμοί
            CoreEngine.update();

            // 2. Events για Μηνύματα
            DOM.widgetBox.addEventListener('click', MessageManager.show);
            document.addEventListener('click', MessageManager.hide, { passive: true });
            document.addEventListener('touchstart', MessageManager.hide, { passive: true });

            // 3. Events για Layout
            LayoutManager.moveWidget();
            window.addEventListener("resize", Utils.debounce(LayoutManager.moveWidget, 150), { passive: true });
            
            // Καθυστέρηση για σιγουριά ότι έχει φορτώσει το HTML17 (Γρίφος)
            setTimeout(LayoutManager.moveWidget, 500); 
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", App.init);
    } else {
        App.init();
    }

})();

(() => {
  "use strict";

  // ==========================================
  // 1. CONFIGURATION
  // ==========================================
  const CONFIG = Object.freeze({
    showThreshold: 1400, // Στα πόσα pixels scroll να εμφανιστεί (από 400 το πήγες 1400)
    debounceDelay: 150
  });

  // ==========================================
  // 2. DOM CACHE
  // ==========================================
  const DOM = {
    btn: null,
    progressCircle: null
  };

  // ==========================================
  // 3. UTILITIES
  // ==========================================
  const Utils = {
    debounce: (func, delay) => {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
      };
    }
  };

  // ==========================================
  // 4. BACK TO TOP MANAGER
  // ==========================================
  const ScrollManager = {
    ticking: false, // Flag για το requestAnimationFrame

    init: () => {
      ScrollManager.buildDOM();
      ScrollManager.setupEvents();
      ScrollManager.updateUI(); // Αρχικός υπολογισμός
    },

    buildDOM: () => {
      let btn = document.querySelector('.toTopBtn');
      if (!btn) {
        btn = document.createElement('button');
        btn.className = 'toTopBtn';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Επιστροφή στην κορυφή');
        
        btn.innerHTML = `
          <svg viewBox="0 0 100 100">
            <circle class="bg-circle" cx="50" cy="50" r="45" />
            <circle class="progress-circle" cx="50" cy="50" r="45" 
                    pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" />
          </svg>
          <svg class="arrow-icon" viewBox="0 0 24 24">
            <path d="m16 12-4-4-4 4M12 16V8"/>
          </svg>`;
        
        document.body.appendChild(btn);
      }

      DOM.btn = btn;
      DOM.progressCircle = btn.querySelector('.progress-circle');
    },

    updateUI: () => {
      const scrollY = window.scrollY;
      
      // Αποτροπή διαίρεσης με το μηδέν (Αν η σελίδα είναι μικρότερη από την οθόνη, βάζουμε 1)
      const docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      
      // Υπολογισμός Προόδου με αυστηρά όρια από 0 έως 100
      const progress = Math.max(0, Math.min(100, (scrollY / docHeight) * 100));
      
      if (DOM.progressCircle) {
        DOM.progressCircle.style.strokeDashoffset = 100 - progress;
      }

      // Εμφάνιση / Απόκρυψη
      if (scrollY > CONFIG.showThreshold) {
        DOM.btn.classList.add('show');
      } else {
        DOM.btn.classList.remove('show');
      }

      ScrollManager.ticking = false; // Ελευθερώνουμε το flag για το επόμενο καρέ
    },

    // Ο controller που προστατεύει τον browser από το σπαμάρισμα των scroll events
    onScroll: () => {
      if (!ScrollManager.ticking) {
        window.requestAnimationFrame(ScrollManager.updateUI);
        ScrollManager.ticking = true;
      }
    },

    scrollToTop: () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    setupEvents: () => {
      window.addEventListener('scroll', ScrollManager.onScroll, { passive: true });
      window.addEventListener('resize', Utils.debounce(ScrollManager.updateUI, CONFIG.debounceDelay), { passive: true });
      DOM.btn.addEventListener('click', ScrollManager.scrollToTop);
    }
  };

  // ==========================================
  // 5. BOOTSTRAP
  // ==========================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ScrollManager.init);
  } else {
    ScrollManager.init();
  }

})();

(() => {
    "use strict";

    // ==========================================
    // 1. CONFIGURATION & DATABASE
    // ==========================================
    const CONFIG = Object.freeze({
        mobileBreakpoint: 768,
        glassBaseId: "quiz-mobile-base",
        glassBaseClass: "widget",
        debounceDelay: 150
    });

    // Η Δεξαμενή Ερωτήσεων (Άδεια για να βάλεις τις δικές σου)
    const QUESTIONS_DB = [
        { text: "Οι καμήλες αποθηκεύουν νερό στην καμπούρα τους.", type: "myth", icon: "🐪", exp: "Αποθηκεύουν λίπος για ενέργεια!" },
        { text: "Οι πιγκουίνοι συναντούν πολικές αρκούδες.", type: "myth", icon: "🐧", exp: "Ποτέ! Ζουν σε αντίθετους πόλους." },
        { text: "Οι χαμαιλέοντες αλλάζουν χρώμα μόνο για να κρυφτούν.", type: "myth", icon: "🦎", exp: "Αλλάζουν χρώμα ανάλογα με τη διάθεσή τους!" },
        { text: "Ο γατόπαρδος είναι το πιο γρήγορο ζώο στη στεριά.", type: "truth", icon: "🐆", exp: "Σωστά! Τρέχει πιο γρήγορα από αυτοκίνητο." },
        { text: "Τα ποντίκια αγαπούν το τυρί περισσότερο από όλα.", type: "myth", icon: "🧀", exp: "Προτιμούν γλυκά, φρούτα και δημητριακά!" },
        { text: "Οι στρουθοκάμηλοι κρύβουν το κεφάλι τους στην άμμο.", type: "myth", icon: "🐦", exp: "Αν νιώσουν κίνδυνο, τρέχουν ή κλωτσάνε!" },
        { text: "Οι αράχνες είναι έντομα.", type: "myth", icon: "🕷️", exp: "Είναι αραχνοειδή με 8 πόδια!" },
        { text: "Οι ταύροι θυμώνουν με το κόκκινο χρώμα.", type: "myth", icon: "🐂", exp: "Αντιδρούν στην κίνηση, όχι στο χρώμα." },
        { text: "Το χρυσόψαρο έχει μνήμη μόνο 3 δευτερολέπτων.", type: "myth", icon: "🐠", exp: "Θυμούνται πράγματα για μήνες!" },
        { text: "Τα χταπόδια έχουν τρεις καρδιές.", type: "truth", icon: "🐙", exp: "Αλήθεια! Έχουν τρεις ξεχωριστές καρδιές." },
        { text: "Οι νυχτερίδες είναι εντελώς τυφλές.", type: "myth", icon: "🦇", exp: "Βλέπουν καλά, αλλά χρησιμοποιούν και ήχο." },
        { text: "Οι ελέφαντες δεν μπορούν να πηδήξουν.", type: "truth", icon: "🐘", exp: "Αλήθεια! Είναι πολύ βαριοί για άλματα." },
        { text: "Οι καρχαρίες δεν αρρωσταίνουν ποτέ.", type: "myth", icon: "🦈", exp: "Αρρωσταίνουν όπως όλα τα ζώα." },
        { text: "Τα σκυλιά βλέπουν μόνο ασπρόμαυρα.", type: "myth", icon: "🐕", exp: "Βλέπουν κυρίως μπλε και κίτρινο." },
        { text: "Ο βάτραχος πίνει νερό από το δέρμα του.", type: "truth", icon: "🐸", exp: "Σωστά! Το απορροφούν μέσω του δέρματος." },
        { text: "Τα φίδια μυρίζουν με τη γλώσσα τους.", type: "truth", icon: "🐍", exp: "Αλήθεια! Έτσι 'πιάνουν' τις μυρωδιές." },
        { text: "Η κουκουβάγια γυρίζει το κεφάλι της 360 μοίρες.", type: "myth", icon: "🦉", exp: "Το γυρίζει έως 270 μοίρες." },
        { text: "Τα μυρμήγκια δεν κοιμούνται ποτέ.", type: "myth", icon: "🐜", exp: "Παίρνουν πολλούς μικρούς υπνάκους." },
        { text: "Οι ιπποπόταμοι βγάζουν ροζ ιδρώτα.", type: "truth", icon: "🦛", exp: "Σωστά! Λειτουργεί σαν αντηλιακό." },
        { text: "Μόνο τα θηλυκά κουνούπια τσιμπάνε.", type: "truth", icon: "🦟", exp: "Αλήθεια! Χρειάζονται το αίμα για τα αυγά." },
        { text: "Τα σαλιγκάρια μπορούν να κοιμηθούν 3 χρόνια.", type: "truth", icon: "🐌", exp: "Αλήθεια! Αν έχει πολλή ξηρασία." },
        { text: "Οι κότες είναι απόγονοι των δεινοσαύρων.", type: "truth", icon: "🐔", exp: "Σωστά! Συγγενεύουν με τον T-Rex." },
        { text: "Το κέρατο του ρινόκερου είναι κόκκαλο.", type: "myth", icon: "🦏", exp: "Είναι από κερατίνη, όπως τα νύχια μας!" },
        { text: "Τα κουνέλια τρώνε μόνο καρότα.", type: "myth", icon: "🐇", exp: "Η βασική τους τροφή είναι το χόρτο." },
        { text: "Οι τίγρεις έχουν ριγέ δέρμα.", type: "truth", icon: "🐅", exp: "Αλήθεια! Ακόμα κι αν ξυριστούν." },
        { text: "Ο Δίας είναι ο μεγαλύτερος πλανήτης.", type: "truth", icon: "🪐", exp: "Σωστά! Χωράει όλους τους άλλους πλανήτες." },
        { text: "Ο Ήλιος είναι κίτρινος.", type: "myth", icon: "☀️", exp: "Είναι λευκός! Φαίνεται κίτρινος λόγω ατμόσφαιρας." },
        { text: "Το φεγγάρι έχει δικό του φως.", type: "myth", icon: "🌙", exp: "Αντανακλά το φως του Ήλιου." },
        { text: "Οι αστροναύτες επιπλέουν στο διάστημα.", type: "truth", icon: "🧑‍🚀", exp: "Σωστά λόγω έλλειψης βαρύτητας." },
        { text: "Το Σινικό Τείχος φαίνεται από το διάστημα με γυμνό μάτι.", type: "myth", icon: "🧱", exp: "Είναι πολύ στενό για να φανεί." },
        { text: "Δεν υπάρχει ήχος στο διάστημα.", type: "truth", icon: "🔇", exp: "Αλήθεια! Υπάρχει κενό αέρος." },
        { text: "Η Γη είναι τέλεια σφαίρα.", type: "myth", icon: "🌍", exp: "Είναι πεπλατυσμένη στους πόλους." },
        { text: "Μια μέρα στην Αφροδίτη διαρκεί πάνω από χρόνο.", type: "truth", icon: "⏳", exp: "Σωστά! Γυρίζει πολύ αργά." },
        { text: "Τα πεφταστέρια είναι αληθινά αστέρια.", type: "myth", icon: "🌠", exp: "Είναι μετεωρίτες που καίγονται." },
        { text: "Ο Άρης είναι ο 'Κόκκινος Πλανήτης'.", type: "truth", icon: "🔴", exp: "Σωστά! Λόγω του σκουριασμένου σιδήρου." },
        { text: "Το φως ταξιδεύει πιο γρήγορα από τον ήχο.", type: "truth", icon: "⚡", exp: "Αλήθεια! Γι' αυτό βλέπεις πρώτα την αστραπή." },
        { text: "Υπάρχει βαρύτητα στη Σελήνη.", type: "truth", icon: "🌕", exp: "Ναι, αλλά 6 φορές ασθενέστερη από τη Γη." },
        { text: "Ο Κρόνος είναι ο μόνος με δακτυλίους.", type: "myth", icon: "🪐", exp: "Έχουν και ο Δίας, ο Ουρανός και ο Ποσειδώνας." },
        { text: "Ο Ήλιος είναι πλανήτης.", type: "myth", icon: "🌞", exp: "Είναι αστέρι!" },
        { text: "Η Γη είναι ο 3ος πλανήτης από τον Ήλιο.", type: "truth", icon: "🌎", exp: "Σωστά! Μετά τον Ερμή και την Αφροδίτη." },
        { text: "Ένα νόμισμα από κτίριο τρυπάει το πεζοδρόμιο.", type: "myth", icon: "🪙", exp: "Είναι πολύ ελαφρύ για κάτι τέτοιο." },
        { text: "Φτιάχνουμε διαμάντια από μολύβια.", type: "truth", icon: "💎", exp: "Και τα δύο είναι από άνθρακα!" },
        { text: "Οι μαύρες τρύπες είναι άδειες.", type: "myth", icon: "🕳️", exp: "Είναι γεμάτες συμπιεσμένη ύλη!" },
        { text: "Το θαλασσινό νερό παγώνει.", type: "truth", icon: "🧊", exp: "Ναι, σε πιο χαμηλή θερμοκρασία από το γλυκό." },
        { text: "Το θερμόμετρο μετράει βάρος.", type: "myth", icon: "🌡️", exp: "Μετράει τη θερμοκρασία." },
        { text: "Ο πάγος επιπλέει στο νερό.", type: "truth", icon: "🧊", exp: "Σωστά! Είναι λιγότερο πυκνός." },
        { text: "Η Ανταρκτική είναι η πιο κρύα ήπειρος.", type: "truth", icon: "❄️", exp: "Σωστά! Έχει φτάσει τους -89 βαθμούς." },
        { text: "Το ουράνιο τόξο είναι τέλειος κύκλος.", type: "truth", icon: "🌈", exp: "Αλήθεια! Φαίνεται από αεροπλάνο." },
        { text: "Ο Ερμής είναι ο πιο ζεστός πλανήτης.", type: "myth", icon: "🌡️", exp: "Η Αφροδίτη είναι πιο ζεστή λόγω ατμόσφαιρας." },
        { text: "Οι αστροναύτες ψηλώνουν στο διάστημα.", type: "truth", icon: "📏", exp: "Σωστά! Η σπονδυλική στήλη τεντώνεται." },
        { text: "Η τσίχλα μένει στο στομάχι 7 χρόνια.", type: "myth", icon: "🍬", exp: "Αποβάλλεται σε λίγες μέρες." },
        { text: "Χρησιμοποιούμε το 10% του εγκεφάλου.", type: "myth", icon: "🧠", exp: "Χρησιμοποιούμε όλο τον εγκέφαλο!" },
        { text: "Τα δακτυλικά αποτυπώματα είναι μοναδικά.", type: "truth", icon: "🖐️", exp: "Σωστά! Ακόμα και στα δίδυμα." },
        { text: "Νύχια και μαλλιά μεγαλώνουν μετά τον θάνατο.", type: "myth", icon: "💅", exp: "Μύθος! Το δέρμα απλώς ζαρώνει." },
        { text: "Η γλώσσα είναι ο δυνατότερος μυς.", type: "myth", icon: "👅", exp: "Είναι ο μυς του σαγονιού (μασητήρας)." },
        { text: "Γεννιόμαστε με περισσότερα οστά.", type: "truth", icon: "🦴", exp: "Σωστά! Ενώνονται καθώς μεγαλώνουμε." },
        { text: "Το αίμα στο σώμα είναι μπλε.", type: "myth", icon: "🩸", exp: "Είναι πάντα κόκκινο!" },
        { text: "Φταρνίζεσαι με τα μάτια ανοιχτά.", type: "myth", icon: "🤧", exp: "Αδύνατο! Είναι αντανακλαστικό." },
        { text: "Η καρδιά έχει μέγεθος γροθιάς.", type: "truth", icon: "❤️", exp: "Σωστά!" },
        { text: "Τα δόντια είναι οστά.", type: "myth", icon: "🦷", exp: "Είναι από σμάλτο, πιο σκληρό από οστό." },
        { text: "Το διάβασμα στο σκοτάδι χαλάει τα μάτια.", type: "myth", icon: "📖", exp: "Απλώς τα κουράζει προσωρινά." },
        { text: "Ο δεξιός πνεύμονας είναι μεγαλύτερος.", type: "truth", icon: "🫁", exp: "Σωστά! Για να χωράει η καρδιά αριστερά." },
        { text: "Το κρύο προκαλεί κρυολόγημα.", type: "myth", icon: "🥶", exp: "Οι ιοί το προκαλούν, όχι το κρύο." },
        { text: "Το σώμα είναι κυρίως νερό.", type: "truth", icon: "💧", exp: "Σωστά! Πάνω από το 60%." },
        { text: "Ο εγκέφαλος κλείνει στον ύπνο.", type: "myth", icon: "😴", exp: "Είναι πολύ ενεργός τότε!" },
        { text: "Η γλώσσα έχει μοναδικό αποτύπωμα.", type: "truth", icon: "😛", exp: "Σωστά! Όπως τα δάχτυλα." },
        { text: "Αυτιά και μύτη μεγαλώνουν πάντα.", type: "truth", icon: "👃", exp: "Σωστά λόγω βαρύτητας στον χόνδρο." },
        { text: "Τα καρότα δίνουν νυχτερινή όραση.", type: "myth", icon: "🥕", exp: "Κάνουν καλό, αλλά όχι τόσο!" },
        { text: "Τα μωρά δεν έχουν δάκρυα στην αρχή.", type: "truth", icon: "👶", exp: "Σωστά! Οι αδένες αργούν να λειτουργήσουν." },
        { text: "Δεν μπορείς να γαργαλήσεις τον εαυτό σου.", type: "truth", icon: "🤣", exp: "Σωστά! Ο εγκέφαλος το περιμένει." },
        { text: "Η αναπνοή πάει στο στομάχι.", type: "myth", icon: "🌬️", exp: "Πηγαίνει στους πνεύμονες!" },
        { text: "Ανατριχιάζουμε για να ζεσταθούμε.", type: "truth", icon: "🥶", exp: "Σωστά! Παγιδεύει αέρα στο δέρμα." },
        { text: "Έχουμε μόνο 5 αισθήσεις.", type: "myth", icon: "👁️", exp: "Έχουμε πολλές περισσότερες!" },
        { text: "Τα νύχια χεριών μεγαλώνουν πιο γρήγορα.", type: "truth", icon: "💅", exp: "Σωστά! 3-4 φορές ταχύτερα." },
        { text: "Η ντομάτα είναι λαχανικό.", type: "myth", icon: "🍅", exp: "Φρούτο!" },
        { text: "Ο κεραυνός δεν χτυπάει 2 φορές στο ίδιο σημείο.", type: "myth", icon: "⚡", exp: "Χτυπάει συχνά τα ίδια σημεία!" },
        { text: "Τα φιστίκια μεγαλώνουν στο χώμα.", type: "truth", icon: "🥜", exp: "Σωστά! Δεν είναι δέντρα." },
        { text: "Οι μπανάνες μεγαλώνουν σε δέντρα.", type: "myth", icon: "🍌", exp: "Είναι γιγάντια βότανα!" },
        { text: "Η Γη έχει περισσότερο νερό.", type: "truth", icon: "🌊", exp: "Σωστά! Καλύπτει το 71%." },
        { text: "Τα ηλιοτρόπια ακολουθούν τον Ήλιο.", type: "truth", icon: "🌻", exp: "Σωστά!" },
        { text: "Η φράουλα έχει τα σπόρια έξω.", type: "truth", icon: "🍓", exp: "Σωστά! Είναι το μόνο φρούτο έτσι." },
        { text: "Το χαρτί είναι από πλαστικό.", type: "myth", icon: "📄", exp: "Είναι από ξύλο δέντρων." },
        { text: "Τα δέντρα κοιμούνται τον χειμώνα.", type: "truth", icon: "🌳", exp: "Σωστά! Μπαίνουν σε ανάπαυση." },
        { text: "Το μέλι δεν χαλάει.", type: "truth", icon: "🍯", exp: "Σωστά!" },
        { text: "Ακούς τη θάλασσα στο κοχύλι.", type: "myth", icon: "🐚", exp: "Ακούς τον αέρα και το αίμα σου." },
        { text: "Η ζάχαρη προκαλεί υπερκινητικότητα.", type: "myth", icon: "🍭", exp: "Φταίει ο ενθουσιασμός, όχι η ζάχαρη." },
        { text: "Ο Πύργος του Άιφελ ψηλώνει το καλοκαίρι.", type: "truth", icon: "🗼", exp: "Σωστά λόγω διαστολής μετάλλου." },
        { text: "Το καρπούζι είναι 92% νερό.", type: "truth", icon: "🍉", exp: "Σωστά!" },
        { text: "Το μπαμπού είναι δέντρο.", type: "myth", icon: "🎍", exp: "Είναι είδος γρασιδιού." },
        { text: "Το χιόνι είναι λευκό.", type: "myth", icon: "❄️", exp: "Είναι διάφανο, απλώς αντανακλά το φως." },
        { text: "Η σοκολάτα είναι από κακάο.", type: "truth", icon: "🍫", exp: "Σωστά!" },
        { text: "Ένα σύννεφο ζυγίζει ελάχιστα.", type: "myth", icon: "☁️", exp: "Ζυγίζει όσο 100 ελέφαντες!" },
        { text: "Το Έβερεστ είναι το ψηλότερο βουνό.", type: "truth", icon: "🏔️", exp: "Σωστά (πάνω από τη θάλασσα)." },
        { text: "Τα αεροπλάνα κουνάνε φτερά.", type: "myth", icon: "✈️", exp: "Πετάνε με κινητήρες και αεροδυναμική." },
        { text: "Ένα κομμένο σκουλήκι γίνεται δύο.", type: "myth", icon: "🪱", exp: "Μόνο το μέρος με το κεφάλι επιζεί." },
        { text: "Το αλάτι λιώνει τον πάγο.", type: "truth", icon: "🧂", exp: "Σωστά!" },
        { text: "Το γυαλί είναι από άμμο.", type: "truth", icon: "🪟", exp: "Σωστά!" },
        { text: "Ροδάκινα και αμύγδαλα είναι ίδια οικογένεια.", type: "truth", icon: "🍑", exp: "Σωστά! Τα ροδοειδή." },
{ text: "Τα γουρούνια ιδρώνουν πολύ.", type: "myth", icon: "🐖", exp: "Δεν έχουν ιδρωτοποιούς αδένες. Κυλιούνται στις λάσπες για να δροσιστούν!" },
        { text: "Τα φλαμίνγκο γεννιούνται ροζ.", type: "myth", icon: "🦩", exp: "Γεννιούνται γκρι! Το ροζ χρώμα έρχεται από τις γαρίδες που τρώνε." },
        { text: "Οι χελώνες μπορούν να βγουν από το καβούκι τους.", type: "myth", icon: "🐢", exp: "Αδύνατον! Είναι ενωμένο με τη σπονδυλική τους στήλη." },
        { text: "Στους ιππόκαμπους, ο μπαμπάς γεννάει τα μωρά.", type: "truth", icon: "🐡", exp: "Αλήθεια! Ο μπαμπάς κουβαλάει τα αυγά στην κοιλιά του." },
        { text: "Τα δελφίνια είναι ψάρια.", type: "myth", icon: "🐬", exp: "Είναι θηλαστικά! Πρέπει να βγουν στην επιφάνεια για να αναπνεύσουν." },
        { text: "Τα κοάλα είναι είδος αρκούδας.", type: "myth", icon: "🐨", exp: "Δεν είναι αρκούδες, είναι μαρσιποφόρα (όπως το καγκουρό)." },
        { text: "Το δέρμα της πολικής αρκούδας είναι μαύρο.", type: "truth", icon: "🐻‍❄️", exp: "Αλήθεια! Το μαύρο δέρμα τραβάει τη ζέστη του ήλιου, ενώ το τρίχωμα είναι διάφανο." },
        { text: "Η αστραπή είναι πιο ζεστή από την επιφάνεια του Ήλιου.", type: "truth", icon: "🌩️", exp: "Σωστά! Είναι περίπου 5 φορές πιο ζεστή." },
        { text: "Οι πεταλούδες γεύονται με τα πόδια τους.", type: "truth", icon: "🦋", exp: "Αλήθεια! Έχουν ειδικούς αισθητήρες γεύσης στα ποδαράκια τους." },
        { text: "Τα μήλα επιπλέουν στο νερό.", type: "truth", icon: "🍎", exp: "Σωστά! Το 25% του όγκου τους είναι γεμάτο με αέρα." },
        { text: "Τα φίδια δεν έχουν αυτιά εξωτερικά.", type: "truth", icon: "🐍", exp: "Σωστά! 'Ακούνε' νιώθοντας τις δονήσεις από το έδαφος." },
        { text: "Ο Πλούτωνας θεωρείται κανονικός πλανήτης.", type: "myth", icon: "🪐", exp: "Πλέον οι αστρονόμοι τον ονομάζουν 'πλανήτη νάνο'." },
        { text: "Όταν φταρνίζεσαι, σταματάει η καρδιά σου.", type: "myth", icon: "🤧", exp: "Η καρδιά συνεχίζει να χτυπάει κανονικά! Απλώς αλλάζει ελάχιστα ο ρυθμός." },
        { text: "Οι γάτες γουργουρίζουν μόνο όταν χαίρονται.", type: "myth", icon: "🐈", exp: "Γουργουρίζουν και όταν φοβούνται, πονάνε, ή για να ηρεμήσουν." },
        { text: "Οι άνθρωποι των σπηλαίων έζησαν μαζί με τους δεινόσαυρους.", type: "myth", icon: "🦖", exp: "Τους χωρίζουν περίπου 65 εκατομμύρια χρόνια!" },
        { text: "Τα μυρμήγκια μπορούν να σηκώσουν βάρος μεγαλύτερο από το δικό τους.", type: "truth", icon: "🐜", exp: "Σωστά! Σηκώνουν από 10 έως και 50 φορές το βάρος τους." },
        { text: "Αν πιάσεις βάτραχο, θα βγάλεις σπυράκια.", type: "myth", icon: "🐸", exp: "Είναι μύθος! Τα 'σπυράκια' του βατράχου είναι απλά αδένες στο δέρμα του." },
        { text: "Η μέλισσα πεθαίνει αφού τσιμπήσει.", type: "truth", icon: "🐝", exp: "Αλήθεια! Χάνει το κεντρί της και δεν μπορεί να επιβιώσει." },
        { text: "Οι κροκόδειλοι βγάζουν αληθινά δάκρυα.", type: "truth", icon: "🐊", exp: "Σωστά! Κλαίνε καθώς τρώνε, απλώς για να καθαρίσουν τα μάτια τους." },
        { text: "Αν καταπιείς κουκούτσι από καρπούζι, θα φυτρώσει στην κοιλιά σου.", type: "myth", icon: "🍉", exp: "Το οξύ στο στομάχι σου δεν το αφήνει να φυτρώσει ποτέ!" },
        { text: "Τα αστέρια έχουν σχήμα σαν αυτό που ζωγραφίζουμε με μύτες.", type: "myth", icon: "⭐", exp: "Είναι τεράστιες, ολοστρόγγυλες μπάλες από φωτιά και αέρια!" },
        { text: "Οι νυχτερίδες ανήκουν στην οικογένεια των πουλιών.", type: "myth", icon: "🦇", exp: "Είναι τα μοναδικά θηλαστικά στον κόσμο που μπορούν να πετάξουν!" },
        { text: "Το μάτι της στρουθοκαμήλου είναι πιο μεγάλο από τον εγκέφαλό της.", type: "truth", icon: "🦤", exp: "Αλήθεια! Έχουν τα μεγαλύτερα μάτια από κάθε άλλο ζώο της στεριάς." },
        { text: "Οι αράχνες κολλούν στον δικό τους ιστό.", type: "myth", icon: "🕸️", exp: "Αποφεύγουν τις κολλώδεις κλωστές και έχουν ειδικό λάδι στα πόδια τους." },
        { text: "Ο βραδύπους είναι το πιο αργό θηλαστικό στον κόσμο.", type: "truth", icon: "🦥", exp: "Σωστά! Κινείται τόσο αργά που φυτρώνουν βρύα στο τρίχωμά του." },
        { text: "Οι καμηλοπαρδάλεις έχουν μπλε ή μωβ γλώσσα.", type: "truth", icon: "🦒", exp: "Σωστά! Το σκούρο χρώμα την προστατεύει από τα εγκαύματα του ήλιου." },
        { text: "Κάθε τέσσερα χρόνια η χρονιά έχει μια μέρα παραπάνω.", type: "truth", icon: "🗓️", exp: "Αλήθεια! Είναι τα δίσεκτα έτη και ο Φεβρουάριος έχει 29 μέρες." },
        { text: "Τα μαργαριτάρια λιώνουν αν τα βάλεις μέσα σε ξύδι.", type: "truth", icon: "🦪", exp: "Αλήθεια! Το ξύδι διαλύει το ασβέστιο από το οποίο είναι φτιαγμένα." },
        { text: "Η πατάτα είναι ρίζα του φυτού.", type: "myth", icon: "🥔", exp: "Είναι 'κόνδυλος', δηλαδή ένα χοντρό υπόγειο κομμάτι του βλαστού!" },
        { text: "Τα άλογα μπορούν να κοιμηθούν όρθια.", type: "truth", icon: "🐴", exp: "Σωστά! Κλειδώνουν τις αρθρώσεις στα πόδια τους για να μην πέσουν." }
    ];

    // ==========================================
    // 2. DOM CACHE (Αποθήκευση στοιχείων στη μνήμη)
    // ==========================================
    const DOM = {
        display: document.getElementById("question-display"),
        feedback: document.getElementById("quiz-feedback"),
        iconSpan: document.getElementById("q-icon"),
        expBox: document.getElementById("explanation-box"),
        expText: document.getElementById("explanation-text"),
        btnRow: document.getElementById("action-buttons"),
        stats: document.getElementById("quiz-stats"),
        qContainer: document.getElementById("question-container"),
        quizOrig: document.getElementById("quiz-original-location"),
        quizWrap: document.getElementById("glass-quiz-wrapper"),
        quizBase: null
    };

    // ==========================================
    // 3. UTILITIES
    // ==========================================
    const Utils = {
        // Προστασία από το σπαμάρισμα του Resize
        debounce: (func, delay) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), delay);
            };
        },
        // Αλγόριθμος Fisher-Yates (Ανακάτεμα O(n) μία φορά)
        shuffleArray: (array) => {
            const newArr = [...array];
            for (let i = newArr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
            }
            return newArr;
        }
    };

    // ==========================================
    // 4. QUIZ ENGINE (Η καρδιά του παιχνιδιού)
    // ==========================================
    const QuizEngine = {
        state: {
            questions: [],
            index: 0,
            score: 0,
            current: null
        },

        init: () => {
            if (QUESTIONS_DB.length === 0) return;
            // Ανακατεύουμε την "τράπουλα" μία φορά στην αρχή
            QuizEngine.state.questions = Utils.shuffleArray(QUESTIONS_DB);
            QuizEngine.loadNext();
        },

        loadNext: () => {
            const s = QuizEngine.state;
            
            // Αν παίξαμε όλες τις ερωτήσεις, ανακατεύουμε ξανά (Άπειρο παιχνίδι)
            if (s.index >= s.questions.length) {
                s.questions = Utils.shuffleArray(QUESTIONS_DB);
                s.index = 0;
            }

            // Ανάγνωση επόμενης ερώτησης σε O(1) χρόνο (Ακαριαία!)
            s.current = s.questions[s.index];
            s.index++;

            // Ενημέρωση του UI
            DOM.display.innerHTML = s.current.text; 
            DOM.iconSpan.innerHTML = s.current.icon;
            DOM.feedback.innerHTML = ""; 
            DOM.expBox.style.display = "none"; 
            DOM.btnRow.style.display = "flex";
            DOM.stats.innerHTML = `Σκορ: <strong>${s.score}</strong>`;

            // Επανεκκίνηση Animation (Reflow Trick)
            DOM.qContainer.classList.remove("question-anim");
            DOM.iconSpan.classList.remove("question-anim");
            void DOM.qContainer.offsetWidth; 
            DOM.qContainer.classList.add("question-anim");
            DOM.iconSpan.classList.add("question-anim");
        },

        processChoice: (userChoice) => {
            const s = QuizEngine.state;
            DOM.btnRow.style.display = "none";
            
            if (userChoice === s.current.type) { 
                s.score++; 
                DOM.feedback.innerHTML = "Σωστά! ✅"; 
                DOM.feedback.style.color = "#27ae60"; 
            } else { 
                DOM.feedback.innerHTML = "Λάθος! ❌"; 
                DOM.feedback.style.color = "#e74c3c"; 
            }
            
            DOM.expText.innerHTML = s.current.exp; 
            DOM.expBox.style.display = "block";
            DOM.stats.innerHTML = `Σκορ: <strong>${s.score}</strong>`;
        }
    };

    // ==========================================
    // 5. LAYOUT MANAGER (Μετακίνηση στα κινητά)
    // ==========================================
    const LayoutManager = {
        getOrCreateBase: () => {
            if (DOM.quizBase) return DOM.quizBase;
            const base = document.createElement("div");
            base.id = CONFIG.glassBaseId;
            base.className = CONFIG.glassBaseClass;
            DOM.quizBase = base;
            return base;
        },

        move: () => {
            if (!DOM.quizWrap) return;

            if (window.innerWidth <= CONFIG.mobileBreakpoint) {
                // Ψάχνει το HTML 6 για να κάτσει από κάτω του
                let target = document.getElementById("video-mobile-base") || document.getElementById("HTML6");
                if (target) {
                    const base = LayoutManager.getOrCreateBase();
                    if (base.parentNode !== target.parentNode || base.previousSibling !== target) {
                        target.after(base); 
                    }
                    if (DOM.quizWrap.parentNode !== base) {
                        base.appendChild(DOM.quizWrap);
                    }
                }
            } else {
                // Επαναφορά στην αρχική θέση (Desktop)
                if (DOM.quizOrig && DOM.quizOrig.parentNode && DOM.quizWrap.parentNode !== DOM.quizOrig.parentNode) {
                    DOM.quizOrig.parentNode.insertBefore(DOM.quizWrap, DOM.quizOrig.nextSibling);
                }
                if (DOM.quizBase?.parentNode) {
                    DOM.quizBase.remove();
                }
            }
        }
    };

    // ==========================================
    // 6. BOOTSTRAP (Εκκίνηση & Event Listeners)
    // ==========================================
    const App = {
        init: () => {
            // Early Return: Αν λείπει το βασικό HTML, ο κώδικας σταματάει αθόρυβα
            if (!DOM.display || !DOM.btnRow) return;

            QuizEngine.init();

            // 1. Event Delegation για τα κουμπιά απάντησης (Μύθος/Αλήθεια)
            DOM.btnRow.addEventListener("click", (e) => {
                const btn = e.target.closest("button");
                if (!btn || !btn.dataset.choice) return;
                QuizEngine.processChoice(btn.dataset.choice);
            });

            // 2. Event Delegation για το κουμπί "Επόμενη Ερώτηση" (μέσα στο κουτί της εξήγησης)
            DOM.expBox.addEventListener("click", (e) => {
                const nextBtn = e.target.closest("button");
                if (nextBtn && nextBtn.dataset.action === "next") {
                    QuizEngine.loadNext();
                }
            });

            // 3. Αρχική Μετακίνηση & Ασφαλής παρακολούθηση Resize
            LayoutManager.move();
            window.addEventListener("resize", Utils.debounce(LayoutManager.move, CONFIG.debounceDelay), { passive: true });
        }
    };

    // Εκτέλεση όταν φορτώσει το DOM
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", App.init);
    } else {
        App.init();
    }

})();

(() => {
    "use strict";

    // ==========================================
    // 1. CONFIGURATION
    // ==========================================
    const CONFIG = Object.freeze({
        mobileBreakpoint: 768,
        mobileBaseId: "video-mobile-base",
        mobileBaseClass: "widget",
        debounceDelay: 150
    });

    // ==========================================
    // 2. DOM CACHE (Αποθήκευση στοιχείων για ταχύτητα)
    // ==========================================
    const DOM = {
        videoBox: document.getElementById("video-widget-box"),
        mainParent: document.getElementById("video-container-main"),
        iframe: document.getElementById("flipbook-iframe"),
        mobileBase: null
    };

    // ==========================================
    // 3. UTILITIES
    // ==========================================
    const Utils = {
        debounce: (func, delay) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), delay);
            };
        }
    };

    // ==========================================
    // 4. LAYOUT MANAGER (Διαχείριση Μετακίνησης)
    // ==========================================
    const LayoutManager = {
        getOrCreateBase: () => {
            if (DOM.mobileBase) return DOM.mobileBase;
            
            let base = document.getElementById(CONFIG.mobileBaseId);
            if (!base) {
                base = document.createElement("div");
                base.id = CONFIG.mobileBaseId;
                base.className = CONFIG.mobileBaseClass;
            }
            DOM.mobileBase = base;
            return base;
        },

        move: () => {
            if (!DOM.videoBox || !DOM.mainParent) return;

            if (window.innerWidth <= CONFIG.mobileBreakpoint) {
                // ΚΙΝΗΤΟ / TABLET: Βρίσκουμε το στόχο (HTML18)
                let target = document.getElementById("holiday-glass-base") || document.getElementById("HTML18");
                if (target) {
                    const base = LayoutManager.getOrCreateBase();
                    // Βάζουμε τη βάση του κινητού σωστά από κάτω
                    if (base.parentNode !== target.parentNode || base.previousSibling !== target) {
                        target.after(base);
                    }
                    // Μεταφέρουμε το βίντεο μέσα στη βάση
                    if (DOM.videoBox.parentNode !== base) {
                        base.appendChild(DOM.videoBox);
                    }
                }
            } else {
                // PC: Επιστροφή στην αρχική του θέση (μέσα στο mainParent)
                if (DOM.videoBox.parentNode !== DOM.mainParent) {
                    DOM.mainParent.appendChild(DOM.videoBox);
                }
                // Καθαρισμός της κινητής βάσης αν υπάρχει
                if (DOM.mobileBase?.parentNode) {
                    DOM.mobileBase.remove();
                }
            }
        }
    };

    // ==========================================
    // 5. VIDEO ENGINE (Διαχείριση Fullscreen)
    // ==========================================
    const VideoEngine = {
        openFullscreen: () => {
            // Διαβάζει το iframe ξανά αν δεν είχε φορτώσει αρχικά
            const currentIframe = DOM.iframe || document.getElementById("flipbook-iframe");
            if (!currentIframe) return;

            if (currentIframe.requestFullscreen) {
                currentIframe.requestFullscreen();
            } else if (currentIframe.webkitRequestFullscreen) { /* Safari */
                currentIframe.webkitRequestFullscreen();
            } else if (currentIframe.msRequestFullscreen) { /* IE11 */
                currentIframe.msRequestFullscreen();
            }
        },

        init: () => {
            // 1. Εκθέτουμε τη συνάρτηση στο global scope για να δουλεύει το onclick του HTML
            window.openLibraryFullscreen = VideoEngine.openFullscreen;

            // 2. Αρχική τοποθέτηση
            LayoutManager.move();

            // 3. Ασφαλής παρακολούθηση resize
            window.addEventListener("resize", Utils.debounce(LayoutManager.move, CONFIG.debounceDelay), { passive: true });

            // 4. Η ΣΩΣΤΗ εναλλακτική για τα τυφλά setTimeout.
            // Όταν το Blogger τελειώσει να φορτώνει όλα τα Widgets, τοποθέτησέ το ξανά αν χρειαστεί.
            window.addEventListener("load", LayoutManager.move);
        }
    };

    // ==========================================
    // 6. BOOTSTRAP (Εκκίνηση)
    // ==========================================
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", VideoEngine.init);
    } else {
        VideoEngine.init();
    }

})();

(() => {
    "use strict";

    // ==========================================
    // 1. CONFIGURATION & SETTINGS
    // ==========================================
    const CONFIG = Object.freeze({
        labels: ["Δράσεις 14-25"], // Βάλε κι άλλες αν θες, π.χ. "Γιορτές"
        maxResults: 150,
        fallbackImg: "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=600&q=80",
        mobileBreakpoint: 768,
        debounceDelay: 150,
        // Ρυθμίσεις Γραμμής (Διαχωριστικό Κινητού)
        separator: {
            thickness: "6px",
            color: "#eaeaea",
            marginTop: "30px",
            marginBottom: "30px",
            width: "102%"
        }
    });

    // ==========================================
    // 2. DOM CACHE (Αποθήκευση στη Μνήμη)
    // ==========================================
    const DOM = {
        widget: null,
        img: null,
        title: null,
        desc: null,
        badge: null,
        date: null,
        btnLink: null,
        origLoc: null,
        mobileWrapper: null
    };

    // ==========================================
    // 3. UTILITIES
    // ==========================================
    const Utils = {
        debounce: (func, delay) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), delay);
            };
        },
        cleanText: (htmlStr) => {
            let temp = document.createElement('div');
            temp.innerHTML = htmlStr;
            let text = temp.textContent || temp.innerText || "";
            return text.replace(/\s+/g, ' ').trim();
        }
    };

    // ==========================================
    // 4. DATA ENGINE (Λήψη & Επεξεργασία Feeds)
    // ==========================================
    const DataEngine = {
        fetchPosts: async () => {
            try {
                const promises = CONFIG.labels.map(label => {
                    const url = `/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json&max-results=${CONFIG.maxResults}`;
                    return fetch(url).then(res => res.json());
                });

                const results = await Promise.all(promises);
                let allEntries = [];
                
                results.forEach(data => {
                    if (data.feed?.entry) allEntries = allEntries.concat(data.feed.entry);
                });

                if (!allEntries.length) throw new Error("Δεν βρέθηκαν αναρτήσεις.");

                // Φιλτράρισμα διπλότυπων
                const seenUrls = new Set();
                const uniqueEntries = allEntries.filter(entry => {
                    const link = entry.link.find(l => l.rel === 'alternate')?.href;
                    if (!link || seenUrls.has(link)) return false;
                    seenUrls.add(link);
                    return true;
                });

                DataEngine.processRandomEntry(uniqueEntries);

            } catch (err) {
                console.warn('Χρονοκάψουλα:', err.message);
                if (DOM.title) DOM.title.innerText = "Σφάλμα Φόρτωσης";
                if (DOM.desc) DOM.desc.innerText = "Δεν μπορέσαμε να ανακτήσουμε τη μνήμη.";
            }
        },

        processRandomEntry: (entries) => {
            const entry = entries[Math.floor(Math.random() * entries.length)];
            
            // Τίτλος & Link
            const title = entry.title.$t || 'Χωρίς Τίτλο';
            const postLink = entry.link.find(l => l.rel === 'alternate')?.href || '#';

            // Εικόνα
            let imgSrc = CONFIG.fallbackImg;
            if (entry.media$thumbnail) {
                imgSrc = entry.media$thumbnail.url.replace(/\/s[0-9]+(\-c)?\//, "/s600/");
            } else if (entry.content?.$t) {
                const imgMatch = entry.content.$t.match(/<img[^>]+src="([^">]+)"/);
                if (imgMatch) imgSrc = imgMatch[1];
            }

            // Περιγραφή (Snippet)
            let desc = entry.snippet || Utils.cleanText(entry.content?.$t || "");
            if (desc.length > 80) desc = desc.substring(0, 80) + '...';

            // Ημερομηνία & Badge
            const pubDate = new Date(entry.published.$t);
            const months = ['Ιαν', 'Φεβ', 'Μάρ', 'Απρ', 'Μάι', 'Ιούν', 'Ιούλ', 'Αύγ', 'Σεπ', 'Οκτ', 'Νοέ', 'Δεκ'];
            const dateStr = `${months[pubDate.getMonth()]} ${pubDate.getFullYear()}`;
            
            const yearsAgo = new Date().getFullYear() - pubDate.getFullYear();
            let badgeText = yearsAgo === 0 ? "Πρόσφατο" : yearsAgo === 1 ? "Πέρυσι" : `${yearsAgo} Χρόνια Πριν`;

            UIEngine.updateCard(imgSrc, title, desc, badgeText, dateStr, postLink);
        }
    };

    // ==========================================
    // 5. UI ENGINE (Οπτικά Εφέ & DOM)
    // ==========================================
    const UIEngine = {
        updateCard: (img, title, desc, badge, date, link) => {
            if (!DOM.widget) return;
            DOM.img.src = img;
            DOM.title.innerText = title;
            DOM.desc.innerText = desc || "Διαβάστε περισσότερα για αυτή τη σχολική στιγμή...";
            DOM.badge.innerText = badge;
            DOM.date.innerText = date;
            DOM.btnLink.href = link;
        },

        createDust: () => {
            if (!DOM.widget) return;
            const fragment = document.createDocumentFragment();
            for (let i = 0; i < 15; i++) {
                let dust = document.createElement("div");
                dust.className = "stc-dust";
                
                dust.style.width = dust.style.height = (Math.random() * 4 + 1) + "px";
                dust.style.left = (Math.random() * 100) + "%";
                dust.style.top = (Math.random() * 100) + "%";
                dust.style.animationDuration = (Math.random() * 10 + 5) + "s";
                dust.style.animationDelay = (Math.random() * 5) + "s";
                
                fragment.appendChild(dust);
            }
            DOM.widget.appendChild(fragment);
        }
    };

    // ==========================================
    // 6. LAYOUT MANAGER (Μετακίνηση στα Κινητά)
    // ==========================================
    const LayoutManager = {
        getOrCreateWrapper: () => {
            if (DOM.mobileWrapper) return DOM.mobileWrapper;
            
            let wrapper = document.getElementById("stc-mobile-wrapper");
            if (!wrapper) {
                wrapper = document.createElement("div");
                wrapper.id = "stc-mobile-wrapper";
                wrapper.style.cssText = "margin: 20px 0 !important; width: 100% !important; display: block !important;";
                
                let hrLine = document.createElement("hr");
                const s = CONFIG.separator;
                hrLine.style.cssText = `border: 0; border-top: ${s.thickness} solid ${s.color}; margin-top: ${s.marginTop}; margin-bottom: ${s.marginBottom}; width: ${s.width}; margin-left: auto; margin-right: auto;`;
                
                wrapper.appendChild(hrLine);
            }
            DOM.mobileWrapper = wrapper;
            return wrapper;
        },

        move: () => {
            if (!DOM.origLoc || !DOM.widget) return;

            if (window.innerWidth <= CONFIG.mobileBreakpoint) {
                // Κινητό: Εύρεση Στόχου (smart-hub ή HTML13)
                let target = document.getElementById("smart-hub") || document.getElementById("HTML13");
                if (target) {
                    const wrapper = LayoutManager.getOrCreateWrapper();
                    if (wrapper.parentNode !== target.parentNode || wrapper.previousSibling !== target) {
                        target.after(wrapper);
                    }
                    if (DOM.widget.parentNode !== wrapper) {
                        wrapper.appendChild(DOM.widget);
                    }
                }
            } else {
                // Desktop: Επαναφορά
                if (DOM.widget.parentNode !== DOM.origLoc.parentNode) {
                    DOM.origLoc.parentNode.insertBefore(DOM.widget, DOM.origLoc.nextSibling);
                }
                if (DOM.mobileWrapper?.parentNode) {
                    DOM.mobileWrapper.remove();
                }
            }
        }
    };

    // ==========================================
    // 7. BOOTSTRAP (Εκκίνηση)
    // ==========================================
    const App = {
        init: () => {
            // Αρχικοποίηση DOM Cache
            DOM.widget = document.getElementById("stc-widget");
            DOM.origLoc = document.getElementById("stc-original-location");
            if (!DOM.widget) return;

            DOM.img = document.getElementById("stc-image");
            DOM.title = document.getElementById("stc-title");
            DOM.desc = document.getElementById("stc-desc");
            DOM.badge = document.getElementById("stc-badge");
            DOM.date = document.getElementById("stc-date");
            DOM.btnLink = document.getElementById("stc-btn-link");

            // Εκτέλεση Λειτουργιών
            DataEngine.fetchPosts();
            UIEngine.createDust();
            
            // Τοποθέτηση & Resize
            LayoutManager.move();
            window.addEventListener('resize', Utils.debounce(LayoutManager.move, CONFIG.debounceDelay), { passive: true });
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", App.init);
    } else {
        App.init();
    }

})();

(() => {
    "use strict";

    // ==========================================
    // 1. CONFIGURATION & DATABASE (PC Version)
    // ==========================================
    const CONFIG = Object.freeze({
        closeDelay: 8000, // Χρόνος αναμονής (σε ms) πριν κλείσει το ευχαριστήριο μήνυμα
        iframeHiddenTop: "-335px", // Η θέση του iframe όταν είναι κρυμμένο
        iframeVisibleTop: "0px"    // Η θέση του iframe για να φανεί το μήνυμα της Google
    });

    // Εδώ θα προσθέσεις αργότερα τις υπόλοιπες 70 ερωτήσεις σου
    const QUESTIONS_DB = [
        { text: "Ποια ήταν η πιο αστεία ή η πιο ενδιαφέρουσα στιγμή από την τελευταία μας εκπαιδευτική επίσκεψη;", emoji: "🚌😆" },
        { text: "Ποια ήταν η αγαπημένη σας δραστηριότητα ή το πιο ενδιαφέρον πράγμα που ανακαλύψαμε αυτή την εβδομάδα στην τάξη;", emoji: "💡🏫" },
        { text: "Ποιο βιβλίο θα προτείνατε σε έναν φίλο σας να διαβάσει οπωσδήποτε αυτό το Σαββατοκύριακο και γιατί;", emoji: "📚🤓" },
        { text: "Αν μπορούσατε να αλλάξετε το τέλος από το παραμύθι/βιβλίο που διαβάσαμε σήμερα, πώς θα θέλατε να τελειώνει;", emoji: "✍️🐉" },
        { text: "Αν το σχολείο μας αποκτούσε τη δική του επίσημη μασκότ, τι ζώο ή πλάσμα θα ήταν και πώς θα την ονομάζαμε;", emoji: "🦄🐾" },
        { text: "Αν αναλαμβάνατε εσείς, ως δημοσιογράφοι, να γράψετε το επόμενο άρθρο στο blog μας, ποιο θέμα θα επιλέγατε να παρουσιάσετε;", emoji: "🎤🗞️" },
        { text: "Ποιο είναι το αγαπημένο σας ομαδικό παιχνίδι στην αυλή κατά τη διάρκεια του διαλείμματος και ποιοι είναι οι κανόνες του;", emoji: "⚽🏃‍♂️" },
        { text: "Αν μπορούσατε να ταξιδέψετε στο διάστημα, ποιον πλανήτη θα επισκεπτόσασταν πρώτο και γιατί;", emoji: "🚀🪐" },
        { text: "Ποιο είναι το αγαπημένο σας μάθημα στο σχολείο και τι σας αρέσει περισσότερο σε αυτό;", emoji: "📖✨" },
        { text: "Αν είχατε μια μαγική υπερδύναμη για μια μέρα στο σχολείο, ποια θα ήταν αυτή;", emoji: "🦸‍♂️⚡" },
        { text: "Ποια είναι η αγαπημένη σας υγιεινή γεύση για το κολατσιό στο διάλειμμα;", emoji: "🍎🥪" },
        { text: "Αν μπορούσατε να φέρετε ένα κατοικίδιο στην τάξη μας για μια μέρα, τι ζώο θα ήταν;", emoji: "🐶🐢" },
        { text: "Ποιο είναι το πιο ενδιαφέρον πείραμα που θα θέλατε να κάνουμε στο μάθημα της φυσικής/μελέτης;", emoji: "🔬🧪" },
        { text: "Αν γράφατε εσείς ένα βιβλίο, ποιος θα ήταν ο κεντρικός ήρωας και τι θα έκανε;", emoji: "✍️🦸‍♀️" },
        { text: "Ποιο τραγούδι ή τι είδος μουσικής σας κάνει να νιώθετε πιο χαρούμενοι όταν το ακούτε;", emoji: "🎵😊" },
        { text: "Αν το σχολείο μας είχε μια 'Ημέρα Χωρίς Μαθήματα', ποιες δραστηριότητες θα θέλατε να κάνουμε;", emoji: "🎨🧩" },
        { text: "Ποιο είναι το καλύτερο αστείο ή ανέκδοτο που ακούσατε πρόσφατα;", emoji: "😂🎭" },
        { text: "Αν μπορούσατε να ταξιδέψετε πίσω στον χρόνο, σε ποια ιστορική εποχή θα πηγαίνατε;", emoji: "⏳🏰" },
        { text: "Ποιο είναι το πιο όμορφο μέρος που έχετε επισκεφθεί σε σχολική εκδρομή ή με την οικογένειά σας;", emoji: "🏞️🗺️" },
        { text: "Αν φτιάχναμε μια χρονοκάψουλα για να την ανοίξουν οι μαθητές μετά από 10 χρόνια, τι θα βάζατε μέσα;", emoji: "📦🕰️" },
        { text: "Ποια είναι η αγαπημένη σας λέξη από όσες μάθαμε φέτος και τι σημαίνει;", emoji: "📝🧠" },
        { text: "Τι σας αρέσει να ζωγραφίζετε περισσότερο όταν έχετε ελεύθερο χρόνο;", emoji: "🖍️🖼️" },
        { text: "Πώς νομίζετε ότι θα μοιάζουν τα σχολεία στο μέλλον, σε 100 χρόνια από τώρα;", emoji: "🤖🏢" },
        { text: "Ποια καλή πράξη θα μπορούσαμε να κάνουμε όλοι μαζί ως τάξη για να βοηθήσουμε το περιβάλλον;", emoji: "🌳♻️" },
        { text: "Αν μπορούσατε να προσκαλέσετε έναν διάσημο (ήρωα, επιστήμονα, συγγραφέα) στην τάξη μας, ποιος θα ήταν;", emoji: "🤩🎙️" },
        { text: "Ποιο είναι το πιο περίεργο ή αστείο όνειρο που έχετε δει και θυμάστε;", emoji: "😴💭" },
        { text: "Αν είχατε ένα μαγικό ραβδί, ποιο πράγμα θα αλλάζατε στον κόσμο σήμερα;", emoji: "🪄🌍" },
        { text: "Τι σας έκανε να χαμογελάσετε περισσότερο σήμερα στο σχολείο ή ποια ευγενική πράξη είδατε να συμβαίνει;", emoji: "😊💖" },
{ text: "Αν μπορούσατε να δημιουργήσετε μια ολοκαίνουργια γιορτή, τι ακριβώς θα γιορτάζαμε και πώς;", emoji: "🎉🎈" },
        { text: "Αν ο αγαπημένος σας ήρωας κινουμένων σχεδίων ερχόταν στο σχολείο μας, τι θα κάνατε μαζί του;", emoji: "🦸‍♂️🎬" },
        { text: "Αν είχαμε ένα μαγικό δεντρόσπιτο στην αυλή του σχολείου, πού θα θέλατε να σας ταξιδέψει;", emoji: "🌳🏡" },
        { text: "Αν φτιάχνατε ένα νέο άθλημα για το μάθημα της γυμναστικής, πώς θα λεγόταν και με τι μπάλα θα παίζαμε;", emoji: "🏅🏐" },
        { text: "Αν τα ζώα μπορούσαν να μιλήσουν, ποιο πιστεύετε ότι θα είχε τις πιο αστείες ιστορίες να μας πει;", emoji: "🗣️🐒" },
        { text: "Αν ήσασταν ο μάγειρας του σχολείου για μία μέρα, ποιο φανταστικό γεύμα θα φτιάχνατε για όλα τα παιδιά;", emoji: "👨‍🍳🍝" },
        { text: "Αν υπήρχε ένα μαγικό φίλτρο που σας μάθαινε αμέσως κάτι καινούργιο, τι θα θέλατε να μάθετε να κάνετε;", emoji: "🧪💡" },
        { text: "Αν κατασκευάζαμε ένα ρομπότ για την τάξη μας, ποιες δουλειές ή δραστηριότητες θα του αναθέταμε να κάνει;", emoji: "🤖🔧" },
        { text: "Αν η τάξη μας γινόταν ταινία, ποιος θα ήταν ο τίτλος της και τι είδους ταινία θα ήταν (π.χ. περιπέτεια, κωμωδία);", emoji: "🍿🎥" },
        { text: "Αν οργανώναμε ένα κυνήγι θησαυρού στο σχολείο, πού θα κρύβατε εσείς τον χάρτη;", emoji: "🗺️🏴‍☠️" },
        { text: "Ποιο μουσικό όργανο θα θέλατε να μάθετε να παίζετε τέλεια και ποιο τραγούδι θα παίζατε πρώτο;", emoji: "🎸🎺" },
        { text: "Αν γνωρίζατε έναν φιλικό εξωγήινο, ποιο παιχνίδι από τη Γη θα του μαθαίνατε να παίζει στο διάλειμμα;", emoji: "👽🛸" },
        { text: "Αν μπορούσατε να σχεδιάσετε την ιδανική σχολική αίθουσα, τι παιχνίδι ή έπιπλο δεν θα έλειπε με τίποτα από μέσα;", emoji: "🛋️🏫" },
        { text: "Όταν μεγαλώσετε, ποιο επάγγελμα θα θέλατε να κάνετε και πώς θα βοηθάτε τους άλλους μέσα από αυτό;", emoji: "👩‍⚕️👷‍♂️" },
        { text: "Αν είχατε ένα ζευγάρι μαγικά παπούτσια, ποιες σούπερ ικανότητες θα σας έδιναν όταν τρέχετε;", emoji: "👟⚡" }
    ];

    // ==========================================
    // 2. DOM CACHE (Μνήμη Στοιχείων PC)
    // ==========================================
    const DOM = {
        wrapper: document.getElementById('pc-quiz-wrapper'),
        form: document.getElementById('quiz-form-pc'),
        trigger: document.getElementById('quiz-trigger-pc'),
        iframe: document.getElementById('google-form-iframe-pc'),
        qText: document.getElementById("q-text-pc"),
        qEmoji: document.getElementById("q-emoji-pc")
    };

    // ==========================================
    // 3. QUIZ MANAGER PC (Κεντρική Λογική)
    // ==========================================
    const QuizManagerPC = {
        isOpen: false,
        formLoadCount: 0,

        init: () => {
            QuizManagerPC.checkVisibility();
            if (DOM.qText && DOM.qEmoji) QuizManagerPC.loadDailyQuestion();
            QuizManagerPC.setupEvents();
        },

        // Έλεγχος: Εμφάνιση ΜΟΝΟ στην αρχική σελίδα
        checkVisibility: () => {
            const path = window.location.pathname;
            if (DOM.wrapper && (path === '/' || path === '/index.html')) {
                DOM.wrapper.classList.add('show-on-home');
            }
        },

        // Δυναμικός Αλγόριθμος Καθημερινής Ερώτησης (Ίδιος με το mobile για συγχρονισμό)
        loadDailyQuestion: () => {
            const today = new Date();
            const startOfYear = new Date(today.getFullYear(), 0, 0);
            const diff = today - startOfYear + (startOfYear.getTimezoneOffset() - today.getTimezoneOffset()) * 60000;
            const dayOfYear = Math.floor(diff / 86400000); // Μέρα του χρόνου (π.χ. 185η μέρα)

            // Επιλογή ερώτησης με βάση τη μέρα
            const dailyQ = QUESTIONS_DB[dayOfYear % QUESTIONS_DB.length];
            DOM.qText.innerText = dailyQ.text;
            DOM.qEmoji.innerHTML = dailyQ.emoji;
        },

        // Άνοιγμα Φόρμας
        open: (e) => {
            if (e) e.stopPropagation();
            if (!DOM.form || !DOM.trigger) return;

            QuizManagerPC.isOpen = true;
            DOM.form.style.display = "block";
            DOM.trigger.style.display = "none";
        },

        // Κλείσιμο Φόρμας
        close: () => {
            if (!DOM.form || !DOM.trigger || !QuizManagerPC.isOpen) return;

            QuizManagerPC.isOpen = false;
            DOM.form.style.display = "none";
            DOM.trigger.style.display = "block";
        },

        // Διαχείριση Υποβολής Google Form (Ηack με το iframe για PC)
        handleIframeLoad: () => {
            QuizManagerPC.formLoadCount++;

            // Η 1η φόρτωση είναι η αρχική. Η 2η είναι όταν πατηθεί "Υποβολή".
            if (QuizManagerPC.formLoadCount === 2) {
                
                // Φέρνουμε το iframe στο top: 0 για να φανεί το ευχαριστήριο μήνυμα της Google
                if (DOM.iframe) DOM.iframe.style.top = CONFIG.iframeVisibleTop;

                // Αυτόματο κλείσιμο και επαναφορά μετά από x δευτερόλεπτα
                setTimeout(() => {
                    QuizManagerPC.close();
                    
                    // Επαναφέρουμε το iframe στην κρυφή του θέση για την επόμενη φορά
                    if (DOM.iframe) DOM.iframe.style.top = CONFIG.iframeHiddenTop;
                    
                    // Μηδενίζουμε τον μετρητή
                    QuizManagerPC.formLoadCount = 0; 
                }, CONFIG.closeDelay);
            }
        },

        setupEvents: () => {
            // Κλείσιμο όταν ο χρήστης κάνει κλικ εκτός της φόρμας (Ασφαλές Event Delegation)
            document.addEventListener('click', (e) => {
                if (QuizManagerPC.isOpen && DOM.form && !DOM.form.contains(e.target) && !e.target.closest('#quiz-trigger-pc')) {
                    QuizManagerPC.close();
                }
            });
        }
    };

    // ==========================================
    // 4. BOOTSTRAP (Εκκίνηση & Global Exports)
    // ==========================================
    // Εκθέτουμε ΜΟΝΟ αυτές τις 2 συναρτήσεις στο global scope (`window`) 
    // με διαφορετικά ονόματα από το mobile, για να δουλεύουν τα HTML onclick/onload.
    window.toggleQuizPC = QuizManagerPC.open;
    window.iframeLoadedPC = QuizManagerPC.handleIframeLoad;

    // Ασφαλής εκκίνηση όταν φορτώσει το DOM
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", QuizManagerPC.init);
    } else {
        QuizManagerPC.init();
    }

})();

(() => {
    "use strict";

    // ==========================================
    // 1. CONFIGURATION
    // ==========================================
    const CONFIG = Object.freeze({
        labels: ["Σύνδεσμοι"],
        maxResults: 53,
        defaultEmoji: "📌"
    });

    // ==========================================
    // 2. DOM CACHE (Αποθήκευση στοιχείων)
    // ==========================================
    const DOM = {
        hub: document.getElementById("smart-hub2"),
        content: document.getElementById("hub-content2"),
        toggle: document.getElementById("hub-toggle2"),
        dynamicContainer: document.getElementById("dynamic-posts-container2")
    };

    // ==========================================
    // 3. UTILITIES
    // ==========================================
    const Utils = {
        // Εξαγωγή Emoji από τον τίτλο
        parseTitle: (rawTitle) => {
            let emoji = CONFIG.defaultEmoji;
            let text = rawTitle.trim();
            const emojiMatch = text.match(/^([\p{Extended_Pictographic}\p{Emoji_Presentation}]+)\s*(.*)/u);
            if (emojiMatch) {
                emoji = emojiMatch[1];
                text = emojiMatch[2];
            }
            return { emoji, text };
        }
    };

    // ==========================================
    // 4. DATA ENGINE (Αυτόματο Τράβηγμα Αναρτήσεων)
    // ==========================================
    const DataEngine = {
        seenUrls: new Set(),

        init: () => {
            if (!DOM.dynamicContainer) return;
            DataEngine.recordExistingLinks();
            DataEngine.fetchPosts();
        },

        // Καταγράφει τα ήδη υπάρχοντα χειροκίνητα links για αποφυγή διπλότυπων
        recordExistingLinks: () => {
            if (!DOM.hub) return;
            const existingLinks = DOM.hub.querySelectorAll('.hub-links a');
            existingLinks.forEach(a => {
                DataEngine.seenUrls.add(a.href.split('?')[0].split('#')[0]);
            });
        },

        fetchPosts: async () => {
            try {
                const promises = CONFIG.labels.map(label => {
                    const url = `/feeds/posts/summary/-/${encodeURIComponent(label)}?alt=json&max-results=${CONFIG.maxResults}`;
                    return fetch(url).then(res => res.json());
                });

                const results = await Promise.all(promises);
                const fragment = document.createDocumentFragment();

                results.forEach(data => {
                    if (!data.feed?.entry) return;
                    
                    data.feed.entry.forEach(entry => {
                        const linkObj = entry.link.find(l => l.rel === 'alternate');
                        if (!linkObj) return;

                        const cleanLink = linkObj.href.split('?')[0].split('#')[0];
                        if (DataEngine.seenUrls.has(cleanLink)) return;
                        
                        DataEngine.seenUrls.add(cleanLink);

                        const { emoji, text } = Utils.parseTitle(entry.title.$t || "");
                        
                        const li = document.createElement('li');
                        li.innerHTML = `
                            <a href="${linkObj.href}">
                                <span class="hub-ic">${emoji}</span>
                                <span class="hub-tx">${text}</span>
                            </a>
                        `;
                        fragment.appendChild(li);
                    });
                });

                DOM.dynamicContainer.appendChild(fragment);

            } catch (err) {
                console.warn('Smart Hub 2: Πρόβλημα φόρτωσης δυναμικών συνδέσμων.', err);
            }
        }
    };

    // ==========================================
    // 5. INTERACTION MANAGER (Διαχείριση Μενού)
    // ==========================================
    const UIManager = {
        toggleMenu: (e) => {
            if (e) e.stopPropagation();
            if (DOM.content && DOM.toggle) {
                DOM.content.classList.toggle("open");
                DOM.toggle.classList.toggle("active");
            }
        },

        closeMenu: (e) => {
            if (DOM.content?.classList.contains('open') && DOM.hub && !DOM.hub.contains(e.target)) {
                DOM.content.classList.remove('open');
                DOM.toggle?.classList.remove('active');
            }
        }
    };

    // ==========================================
    // 6. BOOTSTRAP (Εκκίνηση & Event Listeners)
    // ==========================================
    const App = {
        init: () => {
            // Αν λείπει το βασικό DOM, σταματάει
            if (!DOM.hub) return;

            // Εκκίνηση δεδομένων
            DataEngine.init();

            // Event Listeners (Menu)
            if (DOM.toggle) DOM.toggle.addEventListener('click', UIManager.toggleMenu);
            window.addEventListener('click', UIManager.closeMenu, { passive: true });
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", App.init);
    } else {
        App.init();
    }

})();

(() => {
    "use strict";

    // ==========================================
    // 1. CONFIGURATION & SETTINGS
    // ==========================================
    const CONFIG = Object.freeze({
        labels: ["Διαπαιδαγώγηση", "Ψυχολογία", "Σχολείο", "Υγεία", "Παιχνίδι", "Σελίδες", "Γενικά"],
        maxResults: 3,
        mobileBreakpoint: 768,
        debounceDelay: 150,
        defaultEmoji: "📌"
    });

    // ==========================================
    // 2. DOM CACHE (Αποθήκευση στοιχείων στη μνήμη)
    // ==========================================
    const DOM = {
        hub: document.getElementById("smart-hub"),
        content: document.getElementById("hub-content"),
        toggle: document.getElementById("hub-toggle"),
        dynamicContainer: document.getElementById("dynamic-posts-container"),
        origLoc: document.getElementById("smarthub-original-location"),
        mobileWrapper: null
    };

    // ==========================================
    // 3. UTILITIES
    // ==========================================
    const Utils = {
        debounce: (func, delay) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), delay);
            };
        },
        // Εξαγωγή Emoji από τον τίτλο
        parseTitle: (rawTitle) => {
            let emoji = CONFIG.defaultEmoji;
            let text = rawTitle.trim();
            const emojiMatch = text.match(/^([\p{Extended_Pictographic}\p{Emoji_Presentation}]+)\s*(.*)/u);
            if (emojiMatch) {
                emoji = emojiMatch[1];
                text = emojiMatch[2];
            }
            return { emoji, text };
        }
    };

    // ==========================================
    // 4. DATA ENGINE (Αυτόματο Τράβηγμα Αναρτήσεων)
    // ==========================================
    const DataEngine = {
        seenUrls: new Set(),

        init: () => {
            if (!DOM.dynamicContainer) return;
            DataEngine.recordExistingLinks();
            DataEngine.fetchPosts();
        },

        recordExistingLinks: () => {
            if (!DOM.hub) return;
            const existingLinks = DOM.hub.querySelectorAll('.hub-links a');
            existingLinks.forEach(a => {
                DataEngine.seenUrls.add(a.href.split('?')[0].split('#')[0]);
            });
        },

        fetchPosts: async () => {
            try {
                // Ταυτόχρονο κατέβασμα όλων των κατηγοριών
                const promises = CONFIG.labels.map(label => {
                    const url = `/feeds/posts/summary/-/${encodeURIComponent(label)}?alt=json&max-results=${CONFIG.maxResults}`;
                    return fetch(url).then(res => res.json());
                });

                const results = await Promise.all(promises);
                const fragment = document.createDocumentFragment();

                results.forEach(data => {
                    if (!data.feed?.entry) return;
                    
                    data.feed.entry.forEach(entry => {
                        const linkObj = entry.link.find(l => l.rel === 'alternate');
                        if (!linkObj) return;

                        const cleanLink = linkObj.href.split('?')[0].split('#')[0];
                        if (DataEngine.seenUrls.has(cleanLink)) return;
                        
                        DataEngine.seenUrls.add(cleanLink);

                        const { emoji, text } = Utils.parseTitle(entry.title.$t || "");
                        
                        const li = document.createElement('li');
                        li.innerHTML = `
                            <a href="${linkObj.href}">
                                <span class="hub-ic">${emoji}</span>
                                <span class="hub-tx">${text}</span>
                            </a>
                        `;
                        fragment.appendChild(li);
                    });
                });

                // Προσθήκη όλων μαζί στο DOM για μέγιστη ταχύτητα
                DOM.dynamicContainer.appendChild(fragment);

            } catch (err) {
                console.warn('Smart Hub 1: Πρόβλημα φόρτωσης δυναμικών συνδέσμων.', err);
            }
        }
    };

    // ==========================================
    // 5. UI & LAYOUT MANAGER (Διαχείριση Μενού & Κινητών)
    // ==========================================
    const UIManager = {
        toggleMenu: (e) => {
            if (e) e.stopPropagation();
            if (DOM.content && DOM.toggle) {
                DOM.content.classList.toggle("open");
                DOM.toggle.classList.toggle("active");
            }
        },

        closeMenu: (e) => {
            if (DOM.content?.classList.contains('open') && DOM.hub && !DOM.hub.contains(e.target)) {
                DOM.content.classList.remove('open');
                DOM.toggle?.classList.remove('active');
            }
        },

        getOrCreateWrapper: () => {
            if (DOM.mobileWrapper) return DOM.mobileWrapper;
            
            let wrapper = document.getElementById("smarthub-mobile-wrapper");
            if (!wrapper) {
                // 1. Δημιουργία Wrapper
                wrapper = document.createElement("div");
                wrapper.id = "smarthub-mobile-wrapper";
                wrapper.style.cssText = `
                    margin: 30px 0 !important;
                    padding: 20px 0 0 0 !important;
                    position: relative !important;
                    width: 100% !important;
                    display: block !important;
                    clear: both !important;
                    background: transparent !important;
                `;
                
                // 2. Δημιουργία Full-Width Γραμμής (Bleed-out effect)
                let fullWidthLine = document.createElement("div");
                fullWidthLine.id = "smarthub-full-line";
                fullWidthLine.style.cssText = `
                    position: absolute !important;
                    top: 0 !important;
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                    width: 94vw !important;
                    border-top: 7px solid #e5e7eb !important; 
                    background: transparent !important;
                    pointer-events: none !important;
                `;
                
                wrapper.appendChild(fullWidthLine);
            }
            DOM.mobileWrapper = wrapper;
            return wrapper;
        },

        moveLayout: () => {
            if (!DOM.hub) return;

            if (window.innerWidth <= CONFIG.mobileBreakpoint) {
                // Κινητό: Ψάχνει το στόχο (Slider ή HTML29)
                let target = document.getElementById("slider-wrapper-mobile") || document.getElementById("HTML29");
                if (target) {
                    const wrapper = UIManager.getOrCreateWrapper();
                    
                    if (wrapper.parentNode !== target.parentNode || wrapper.previousSibling !== target) {
                        target.after(wrapper);
                    }
                    if (DOM.hub.parentNode !== wrapper) {
                        wrapper.appendChild(DOM.hub);
                    }
                }
            } else {
                // Desktop: Επαναφορά στην αρχική θέση
                if (DOM.origLoc?.parentNode && DOM.hub.parentNode !== DOM.origLoc.parentNode) {
                    DOM.origLoc.parentNode.insertBefore(DOM.hub, DOM.origLoc.nextSibling);
                }
                if (DOM.mobileWrapper?.parentNode) {
                    DOM.mobileWrapper.remove();
                }
            }
        }
    };

    // ==========================================
    // 6. BOOTSTRAP (Εκκίνηση & Event Listeners)
    // ==========================================
    const App = {
        init: () => {
            if (!DOM.hub) return;

            // 1. Εκκίνηση Φόρτωσης Δεδομένων
            DataEngine.init();

            // 2. Event Listeners (Menu)
            if (DOM.toggle) DOM.toggle.addEventListener('click', UIManager.toggleMenu);
            window.addEventListener('click', UIManager.closeMenu, { passive: true });

            // 3. Event Listeners (Layout Movement)
            UIManager.moveLayout();
            window.addEventListener("resize", Utils.debounce(UIManager.moveLayout, CONFIG.debounceDelay), { passive: true });
            
            // Ασφαλής επανέλεγχος όταν φορτώσουν όλα τα widgets
            window.addEventListener("load", UIManager.moveLayout, { once: true });
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", App.init);
    } else {
        App.init();
    }

})();

(() => {
    "use strict";

    // ==========================================
    // 1. CONFIGURATION
    // ==========================================
    const CONFIG = Object.freeze({
        defaultLang: 'el',
        idleTimeout: 10000, // Χρόνος (σε ms) πριν κρυφτεί το κουμπί
        maxRetries: 10,     // Προσπάθειες αν καθυστερήσει η Google
        retryDelay: 500
    });

    // ==========================================
    // 2. DOM CACHE
    // ==========================================
    const DOM = {
        btn: document.getElementById('gt-floating-btn'),
        menu: document.getElementById('gt-languages-modal'),
        combo: null // Το select της Google (το βρίσκει δυναμικά)
    };

    // ==========================================
    // 3. UTILITIES
    // ==========================================
    const Utils = {
        // Αποτρέπει την εξάντληση της CPU στα scroll/mousemove
        throttle: (func, limit) => {
            let inThrottle;
            return (...args) => {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }
    };

    // ==========================================
    // 4. TRANSLATION ENGINE (Με Retry Logic)
    // ==========================================
    // Το callback πρέπει να είναι global για να το "δει" η Google
    window.googleTranslateElementInit_custom = () => {
        new window.google.translate.TranslateElement({
            pageLanguage: CONFIG.defaultLang,
            autoDisplay: false
        }, 'google_translate_element_custom');
    };

    const TranslationEngine = {
        applyLang: (lang, retryCount = 0) => {
            if (!lang) return;
            
            DOM.combo = DOM.combo || document.querySelector("select.goog-te-combo");
            
            if (DOM.combo) {
                DOM.combo.value = lang;
                DOM.combo.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                UIManager.closeMenu();
            } else {
                if (retryCount < CONFIG.maxRetries) {
                    setTimeout(() => TranslationEngine.applyLang(lang, retryCount + 1), CONFIG.retryDelay);
                } else {
                    console.warn("Google Translate: Υπέρβαση χρόνου φόρτωσης.");
                }
            }
        }
    };

    // ==========================================
    // 5. UI & INTERACTION MANAGER
    // ==========================================
    const UIManager = {
        idleTimer: null,

        toggleMenu: (e) => {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            if (!DOM.menu) return;
            
            const isFlex = DOM.menu.style.display === 'flex';
            DOM.menu.style.display = isFlex ? 'none' : 'flex';
            
            // Αν το μενού ανοίξει, σταματάμε να μετράμε χρόνο για απόκρυψη
            if (!isFlex) {
                UIManager.showButton();
                clearTimeout(UIManager.idleTimer);
            } else {
                UIManager.resetIdleTimer();
            }
        },

        closeMenu: () => {
            if (DOM.menu) DOM.menu.style.display = 'none';
            UIManager.resetIdleTimer();
        },

        relocateElements: () => {
            // Μεταφορά στο τέλος του body για απόλυτη συμβατότητα με fixed positioning
            if (DOM.btn && DOM.btn.parentNode !== document.body) document.body.appendChild(DOM.btn);
            if (DOM.menu && DOM.menu.parentNode !== document.body) document.body.appendChild(DOM.menu);
        },

        hideButton: () => {
            if (DOM.btn && DOM.menu && DOM.menu.style.display !== 'flex') {
                DOM.btn.classList.add('is-hidden');
            }
        },

        showButton: () => {
            if (DOM.btn && DOM.btn.classList.contains('is-hidden')) {
                DOM.btn.classList.remove('is-hidden');
            }
        },

        resetIdleTimer: () => {
            UIManager.showButton();
            clearTimeout(UIManager.idleTimer);
            UIManager.idleTimer = setTimeout(UIManager.hideButton, CONFIG.idleTimeout);
        }
    };

    // ==========================================
    // 6. BOOTSTRAP (Εκκίνηση)
    // ==========================================
    const App = {
        init: () => {
            UIManager.relocateElements();

            // Ασύγχρονη φόρτωση του Google Translate Script
            const gtScript = document.createElement('script');
            gtScript.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit_custom";
            gtScript.async = true; 
            gtScript.defer = true;
            document.body.appendChild(gtScript);

            // Event Listeners: Άνοιγμα Μενού
            if (DOM.btn) DOM.btn.addEventListener('click', UIManager.toggleMenu);
            
            // Event Delegation: Κλικ στις γλώσσες (ψάχνει το data-lang)
            if (DOM.menu) {
                DOM.menu.addEventListener('click', (e) => {
                    const langBtn = e.target.closest('[data-lang]');
                    if (langBtn) {
                        e.preventDefault();
                        TranslationEngine.applyLang(langBtn.dataset.lang);
                    }
                });
            }

            // Event Listeners: Κλείσιμο μενού με κλικ απ' έξω
            document.addEventListener('click', (e) => {
                if (DOM.menu && DOM.menu.style.display === 'flex' && !DOM.menu.contains(e.target) && (!DOM.btn || !DOM.btn.contains(e.target))) {
                    UIManager.closeMenu();
                }
            }, { passive: true });

            // Event Listeners: Idle Timer (με throttle 200ms για να μην κολλάει το UI)
            const throttledReset = Utils.throttle(UIManager.resetIdleTimer, 200);
            ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
                document.addEventListener(evt, throttledReset, { passive: true });
            });

            // Εκκίνηση χρονομέτρου
            UIManager.resetIdleTimer();
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", App.init);
    } else {
        App.init();
    }

})();


(() => {
    "use strict";

    // 1. CONFIGURATION: Κεντρική διαχείριση (Αποφεύγουμε τα hardcoded strings)
    const CONFIG = Object.freeze({
        SELECTORS: {
            BAR: "#school-alert-bar",
            TEXT: "#alert-text-message",
            CLOSE_BTN: ".alert-close-btn" // Βάλε αυτή την κλάση στο X κουμπί σου
        },
        STORAGE_KEY: "school_alert_dismissed",
        STORAGE_HOURS: 24, // Πόσες ώρες να μην ξαναβγεί αν το κλείσει ο χρήστης
        IGNORE_WORDS: ["ΕΔΩ ΓΡΑΦΕΙΣ"]
    });

    // 2. ENGINE ΚΛΑΣΗ
    class AlertEngine {
        constructor() {
            this.hasInitialized = false;
        }

        init() {
            // Guard: Αποφυγή διπλής εκτέλεσης (από DOMContentLoaded και Load)
            if (this.hasInitialized) return;
            
            const alertBar = document.querySelector(CONFIG.SELECTORS.BAR);
            const alertTextElem = document.querySelector(CONFIG.SELECTORS.TEXT);

            // Error Checking: Αν δεν υπάρχουν τα στοιχεία στο HTML, σταμάτα ομαλά
            if (!alertBar || !alertTextElem) return;

            this.hasInitialized = true;
            const text = alertTextElem.innerText.trim();

            // Έλεγχος αν πρέπει να κρυφτεί (Άδειο, #, λέξεις-κλειδιά, ή αν το έχει ήδη κλείσει)
            if (this.shouldHide(text)) {
                alertBar.style.display = "none";
                return;
            }

            // ΕΞΥΠΝΗ ΜΕΤΑΚΙΝΗΣΗ (στην αρχή του body)
            document.body.insertBefore(alertBar, document.body.firstChild);
            alertBar.style.display = "flex";

            // Event Delegation για το κλείσιμο (χωρίς onclick="" στο HTML)
            alertBar.addEventListener("click", (e) => {
                if (e.target.closest(CONFIG.SELECTORS.CLOSE_BTN)) {
                    this.dismiss(alertBar);
                }
            });
        }

        shouldHide(text) {
            // Αν το έχει κλείσει πρόσφατα
            if (this.checkMemory()) return true;
            // Αν το κείμενο είναι άδειο ή αρχίζει από #
            if (!text || text.startsWith("#")) return true;
            // Αν περιέχει απαγορευμένες λέξεις
            if (CONFIG.IGNORE_WORDS.some(word => text.includes(word))) return true;
            
            return false;
        }

        dismiss(alertBar) {
            alertBar.style.display = "none";
            // Αποθήκευση στο localStorage της τρέχουσας ώρας + διάρκεια
            const expiry = Date.now() + (CONFIG.STORAGE_HOURS * 60 * 60 * 1000);
            localStorage.setItem(CONFIG.STORAGE_KEY, expiry.toString());
        }

        checkMemory() {
            const storedTime = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (!storedTime) return false;
            
            // Έλεγχος αν έχει λήξει η "μνήμη" (π.χ. πέρασαν 24 ώρες)
            if (Date.now() > parseInt(storedTime, 10)) {
                localStorage.removeItem(CONFIG.STORAGE_KEY);
                return false;
            }
            return true; // Το θυμάται, άρα κρατάμε τη μπάρα κλειστή
        }
    }

    // 3. BOOTSTRAP: Ασφαλής εκκίνηση
    const app = new AlertEngine();

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => app.init());
    } else {
        app.init();
    }
    window.addEventListener("load", () => app.init());

})();

