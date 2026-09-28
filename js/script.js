document.addEventListener('DOMContentLoaded', () => {

  // =========================================
  // HEADER SCROLL EFFECT
  // =========================================
  const header = document.getElementById('header');
  if (header) {
    const updateHeader = () => {
      header.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', updateHeader, { passive: true });
    updateHeader();
  }

  // =========================================
  // MOBILE MENU TOGGLE
  // =========================================
  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.getElementById('mainNav');

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Cerrar al hacer click en un link
    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    // Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
      if (mainNav.classList.contains('open') &&
          !mainNav.contains(e.target) &&
          !menuToggle.contains(e.target)) {
        mainNav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  // =========================================
  // CHATBOT ASERTIVA MENTE (conectado al backend)
  // =========================================
  const chatToggle = document.getElementById('chat-toggle');
  const chatBox = document.getElementById('chat-box');
  const closeChat = document.getElementById('close-chat');
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');
  const chatMessages = document.getElementById('chat-messages');

  let historialChat = [];

  if (chatToggle && chatBox && chatInput && chatSend && chatMessages) {

    function chatVisible() {
      // Leer el estado REAL aplicando todo el CSS (incluido !important)
      return window.getComputedStyle(chatBox).display !== 'none';
    }

    function abrirChat() {
      // setProperty con 'important' vence cualquier regla CSS, incluso con !important en styles.css
      chatBox.style.setProperty('display', 'flex', 'important');
      chatBox.style.setProperty('flex-direction', 'column', 'important');
      chatInput.focus();
    }

    function cerrarChatBox() {
      chatBox.style.setProperty('display', 'none', 'important');
    }

    // Abrir/Cerrar con el gatito
    chatToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (chatVisible()) {
        cerrarChatBox();
      } else {
        abrirChat();
      }
    });

    // Botón X para cerrar
    if (closeChat) {
      closeChat.addEventListener('click', (e) => {
        e.stopPropagation();
        cerrarChatBox();
      });
    }

    // ---- Indicador "escribiendo..." ----
    let typingEl = null;
    let typingInterval = null;

    function mostrarEscribiendo() {
      typingEl = document.createElement('div');
      typingEl.style.cssText = 'background: #e0f2f1; color: #333; padding: 10px; border-radius: 10px; align-self: flex-start; max-width: 80%; font-style: italic; display: flex; align-items: center; gap: 6px;';

      typingEl.innerHTML = '<span class="typing-text">escribiendo</span>';

      const texto = typingEl.querySelector('.typing-text');
      let puntos = 0;
      typingInterval = setInterval(() => {
        puntos = (puntos + 1) % 4;
        texto.textContent = 'escribiendo' + '.'.repeat(puntos);
      }, 400);

      chatMessages.appendChild(typingEl);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function ocultarEscribiendo() {
      if (typingInterval) {
        clearInterval(typingInterval);
        typingInterval = null;
      }
      if (typingEl) {
        typingEl.remove();
        typingEl = null;
      }
    }

    function appendBotMessage(text) {
      const botMsg = document.createElement('div');
      botMsg.style.cssText = 'background: #e0f2f1; color: #333; padding: 10px; border-radius: 10px; align-self: flex-start; max-width: 80%; word-break: break-word;';

      // Detectar URL de WhatsApp y convertirla en botón verde
      const urlRegex = /(https:\/\/wa\.me\/[^\s\)\]]+)/g;
      const formattedText = text.replace(urlRegex, (url) => {
        return `<br><a href="${url}" target="_blank" style="display:inline-block; margin-top:8px; background:#25D366; color:white; padding:8px 14px; border-radius:6px; text-decoration:none; font-weight:bold;">📲 Enviar cita a WhatsApp</a>`;
      });

      botMsg.innerHTML = formattedText;
      chatMessages.appendChild(botMsg);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // ---- Envío de mensajes al backend ----
    const sendMessage = async () => {
      const message = chatInput.value.trim();
      if (!message) return;

      const userMsg = document.createElement('div');
      userMsg.style.cssText = 'background: #008080; color: white; padding: 10px; border-radius: 10px; align-self: flex-end; max-width: 80%; word-break: break-word;';
      userMsg.textContent = message;
      chatMessages.appendChild(userMsg);

      chatInput.value = '';
      chatInput.disabled = true;
      chatSend.disabled = true;
      chatMessages.scrollTop = chatMessages.scrollHeight;

      mostrarEscribiendo();

      try {
        const res = await fetch('http://localhost:3000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: message, history: historialChat })
        });

        const data = await res.json();

        ocultarEscribiendo();

        if (data.error) {
          appendBotMessage('Lo siento, hubo un error procesando tu mensaje. Por favor, inténtalo de nuevo en unos segundos.');
        } else {
          historialChat.push({ role: 'user', text: message });
          historialChat.push({ role: 'model', text: data.reply });

          appendBotMessage(data.reply);
        }

      } catch (err) {
        ocultarEscribiendo();
        appendBotMessage('Ocurrió un error al conectar con el servidor. Verifica que el servidor esté activo (npm start).');
      } finally {
        chatInput.disabled = false;
        chatSend.disabled = false;
        chatInput.focus();
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    };

    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  // =========================================
  // FAQ ACCORDION
  // =========================================
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!question || !answer) return;

    answer.hidden = true;

    const closeOthers = () => {
      document.querySelectorAll('.faq-item').forEach(otherItem => {
        const otherQuestion = otherItem.querySelector('.faq-question');
        const otherAnswer = otherItem.querySelector('.faq-answer');

        if (!otherQuestion || !otherAnswer || otherItem === item) return;

        otherItem.classList.remove('active');
        otherQuestion.setAttribute('aria-expanded', 'false');
        otherAnswer.hidden = true;
      });
    };

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('active');

      closeOthers();

      if (isOpen) {
        item.classList.remove('active');
        question.setAttribute('aria-expanded', 'false');
        answer.hidden = true;
        return;
      }

      item.classList.add('active');
      question.setAttribute('aria-expanded', 'true');
      answer.hidden = false;
    });
  });

  // =========================================
  // SCROLL REVEAL
  // =========================================
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -30px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add('active'));
  }

  // =========================================
  // CONTADOR ANIMADO
  // =========================================
  const counters = document.querySelectorAll('.counter');

  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    if (isNaN(target)) return;
    const duration = 1800;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  if (counters.length > 0 && 'IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(c => counterObserver.observe(c));
  }

  // =========================================
  // BOTÓN VOLVER ARRIBA
  // =========================================
  const backToTop = document.getElementById('backToTop');

  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // =========================================
  // SMOOTH SCROLL (anclas internas)
  // =========================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const headerHeight = header ? header.offsetHeight : 0;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight - 20;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }
    });
  });

});