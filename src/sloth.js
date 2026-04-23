/**
 * Sloth.js
 * Move slow. Build fast.
 * A lightweight, declarative toolkit for backend developers.
 */
class Sloth {
  constructor() {
    this.config = {
      baseURL: '',
      token: null,
      loaderHTML: '<div class="sloth-loader" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.8);z-index:9999;display:flex;justify-content:center;align-items:center;font-size:1.5rem;">Loading...</div>'
    };
    
    // Event tracking: Map<eventType, Map<selector, Set<handler>>>
    this.events = new Map(); 
    this.routes = [];
    this.actionRegistry = {};
    this.actionsBound = false;
    this._loaderEl = null;
  }

  // ==========================================
  // 1. HTTP Requests (Fetch Wrapper)
  // ==========================================
  
  setBaseURL(url) { this.config.baseURL = url; return this; }
  setToken(token) { this.config.token = token; return this; }

  async _request(method, endpoint, body = null, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.config.baseURL}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.config.token) headers['Authorization'] = `Bearer ${this.config.token}`;

    const config = { method, headers, ...options };
    if (body && (method === 'POST' || method === 'PUT')) config.body = JSON.stringify(body);

    try {
      const response = await fetch(url, config);
      const isJson = response.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await response.json() : await response.text();
      
      if (!response.ok) throw { status: response.status, data };
      return data;
    } catch (err) {
      console.error(`[Sloth HTTP Error] ${method} ${url}:`, err);
      throw err;
    }
  }

  get(url, options) { return this._request('GET', url, null, options); }
  post(url, body, options) { return this._request('POST', url, body, options); }
  put(url, body, options) { return this._request('PUT', url, body, options); }
  delete(url, options) { return this._request('DELETE', url, null, options); }

  // ==========================================
  // 2. DOM Utilities
  // ==========================================

  el(selector) {
    const node = typeof selector === 'string' ? document.querySelector(selector) : selector;
    return this._wrapDom(node ? [node] : []);
  }

  els(selector) {
    const nodes = typeof selector === 'string' ? Array.from(document.querySelectorAll(selector)) : selector;
    return this._wrapDom(nodes || []);
  }

  _wrapDom(elements) {
    return {
      nodes: elements,
      node: elements[0] || null,
      html: (val) => {
        if (val === undefined) return elements[0]?.innerHTML || '';
        elements.forEach(e => e.innerHTML = val);
        return this._wrapDom(elements);
      },
      text: (val) => {
        if (val === undefined) return elements[0]?.textContent || '';
        elements.forEach(e => e.textContent = val);
        return this._wrapDom(elements);
      },
      addClass: (cls) => { elements.forEach(e => e.classList.add(cls)); return this._wrapDom(elements); },
      removeClass: (cls) => { elements.forEach(e => e.classList.remove(cls)); return this._wrapDom(elements); },
      toggleClass: (cls) => { elements.forEach(e => e.classList.toggle(cls)); return this._wrapDom(elements); },
      on: (event, handler) => { elements.forEach(e => e.addEventListener(event, handler)); return this._wrapDom(elements); }
    };
  }

  // ==========================================
  // 3. Event Handling (Delegation & Deduplication)
  // ==========================================

  on(selector, event, handler) {
    if (!this.events.has(event)) {
      this.events.set(event, new Map());
      document.addEventListener(event, (e) => this._delegateEvent(e, event));
    }
    
    const selectorMap = this.events.get(event);
    if (!selectorMap.has(selector)) selectorMap.set(selector, new Set());
    
    selectorMap.get(selector).add(handler);
    return this;
  }

  off(selector, event, handler) {
    const selectorMap = this.events.get(event);
    if (selectorMap && selectorMap.has(selector)) {
      if (handler) {
        selectorMap.get(selector).delete(handler);
      } else {
        selectorMap.delete(selector);
      }
    }
    return this;
  }

  _delegateEvent(e, event) {
    const selectorMap = this.events.get(event);
    if (!selectorMap) return;

    for (let [selector, handlers] of selectorMap.entries()) {
      const target = e.target.closest(selector);
      if (target) {
        handlers.forEach(fn => fn.call(target, e, target));
      }
    }
  }

  // ==========================================
  // 4. SPA Hash Routing
  // ==========================================

  route(path, handler) {
    // Convert path with params like /user/:id to regex
    const regexPath = path.replace(/:\w+/g, '([^\\/]+)');
    this.routes.push({ regex: new RegExp(`^${regexPath}$`), keys: (path.match(/:\w+/g) || []).map(k => k.slice(1)), handler });
    return this;
  }

  startRouter() {
    const handleHash = () => {
      const path = window.location.hash.slice(1) || '/';
      for (let route of this.routes) {
        const match = path.match(route.regex);
        if (match) {
          const params = route.keys.reduce((acc, key, i) => ({ ...acc, [key]: match[i + 1] }), {});
          route.handler(params);
          return;
        }
      }
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
  }

  // ==========================================
  // 5. Form Utilities
  // ==========================================

  formToJSON(formSelector) {
    const form = typeof formSelector === 'string' ? document.querySelector(formSelector) : formSelector;
    if (!form) return {};
    const data = {};

    for (let el of form.elements) {
      if (!el.name || el.disabled) continue;

      if (el.type === 'checkbox') {
        data[el.name] = el.checked;
      } else if (el.type === 'radio') {
        if (el.checked) data[el.name] = el.value;
      } else if (el.type === 'select-multiple') {
        data[el.name] = Array.from(el.selectedOptions).map(o => o.value);
      } else {
        if (data[el.name] !== undefined) {
          if (!Array.isArray(data[el.name])) data[el.name] = [data[el.name]];
          data[el.name].push(el.value);
        } else {
          data[el.name] = el.value;
        }
      }
    }
    return data;
  }

  // ==========================================
  // 6. Form Validation
  // ==========================================

  validate(formSelector) {
    const form = typeof formSelector === 'string' ? document.querySelector(formSelector) : formSelector;
    let valid = true;
    let errors = {};

    if (form) {
      for (let el of form.elements) {
        if (!el.name || el.disabled) continue;
        const val = el.value.trim();

        if (el.hasAttribute('data-required') && !val) {
          valid = false; errors[el.name] = el.getAttribute('data-error') || 'Required';
        } else if (el.hasAttribute('data-email') && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          valid = false; errors[el.name] = el.getAttribute('data-error') || 'Invalid email';
        } else if (el.hasAttribute('data-min') && val && Number(val) < Number(el.getAttribute('data-min'))) {
          valid = false; errors[el.name] = el.getAttribute('data-error') || `Minimum is ${el.getAttribute('data-min')}`;
        } else if (el.hasAttribute('data-max') && val && Number(val) > Number(el.getAttribute('data-max'))) {
          valid = false; errors[el.name] = el.getAttribute('data-error') || `Maximum is ${el.getAttribute('data-max')}`;
        } else if (el.hasAttribute('data-pattern') && val && !new RegExp(el.getAttribute('data-pattern')).test(val)) {
          valid = false; errors[el.name] = el.getAttribute('data-error') || 'Invalid format';
        }
      }
    }
    return { valid, errors };
  }

  // ==========================================
  // 7. Global Loader
  // ==========================================

  setLoader(templateString) {
    this.config.loaderHTML = templateString;
    return this;
  }

  showLoader() {
    if (!this._loaderEl) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = this.config.loaderHTML;
      this._loaderEl = wrapper.firstElementChild;
      document.body.appendChild(this._loaderEl);
    }
    this._loaderEl.style.display = '';
  }

  hideLoader() {
    if (this._loaderEl) this._loaderEl.style.display = 'none';
  }

  // ==========================================
  // 8. Template Replacer
  // ==========================================

  render(templateString, dataObject = {}) {
    return templateString.replace(/\{([\w.]+)\}/g, (match, key) => {
      const keys = key.split('.');
      let val = dataObject;
      for (let k of keys) {
        if (val == null) break;
        val = val[k];
      }
      return val !== undefined && val !== null ? val : '';
    });
  }

  // ==========================================
  // 9. Declarative Actions
  // ==========================================

  actions(actionMap) {
    this.actionRegistry = { ...this.actionRegistry, ...actionMap };
    
    if (!this.actionsBound) {
      document.addEventListener('click', e => this._triggerAction(e, 'data-click'));
      document.addEventListener('submit', e => {
        if (e.target.hasAttribute('data-submit')) e.preventDefault();
        this._triggerAction(e, 'data-submit');
      });
      this.actionsBound = true;
    }
  }

  _triggerAction(e, attr) {
    const el = e.target.closest(`[${attr}]`);
    if (!el) return;

    const actionStr = el.getAttribute(attr);
    const match = actionStr.match(/^([a-zA-Z0-9_]+)(?:\((.*)\))?$/);
    
    if (match) {
      const name = match[1];
      const params = match[2] ? match[2].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')) : [];
      
      if (this.actionRegistry[name]) {
        const formData = attr === 'data-submit' ? this.formToJSON(el) : null;
        this.actionRegistry[name]({
          event: e,
          el,
          data: formData,
          params
        });
      }
    }
  }

  // ==========================================
  // 10. Auto-Bind (Reactive State)
  // ==========================================

  bind(stateObject) {
    return this._createProxy(stateObject, '');
  }

  _createProxy(obj, pathPrefix) {
    const self = this;
    return new Proxy(obj, {
      set(target, prop, value) {
        target[prop] = value;
        const fullPath = pathPrefix ? `${pathPrefix}.${prop}` : prop;
        
        document.querySelectorAll(`[data-bind="${fullPath}"]`).forEach(el => {
          if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
            if (el.type === 'checkbox') el.checked = !!value;
            else el.value = value;
          } else {
            el.textContent = value;
          }
        });
        return true;
      },
      get(target, prop) {
        const val = target[prop];
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          return self._createProxy(val, pathPrefix ? `${pathPrefix}.${prop}` : prop);
        }
        return val;
      }
    });
  }

  // ==========================================
  // 11. Clipboard
  // ==========================================
  
  /**
   * Copies text or the value/content of an element to the clipboard.
   * @param {string} textOrSelector - Literal text or a CSS selector (e.g., '#input-id').
   * @param {Object} [options={}] - Callbacks for success(text) and error(err).
   * @returns {Sloth} The Sloth instance for chaining.
   */
  copy(textOrSelector, options = {}) {
    let textToCopy = textOrSelector;
    
    // If it has no spaces and starts with # or ., assume it is a DOM selector
    if (typeof textOrSelector === 'string' && /^[#.]\w/.test(textOrSelector)) {
      const el = document.querySelector(textOrSelector);
      if (el) {
        // Get value if it's an input/textarea, otherwise get textContent
        textToCopy = el.value !== undefined ? el.value : el.textContent;
      }
    }

    if (!navigator.clipboard) {
      console.warn('[Sloth] Clipboard API not supported in this browser.');
      if (options.error) options.error(new Error('Clipboard API not supported'));
      return this;
    }

    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        if (options.success) options.success(textToCopy);
      })
      .catch(err => {
        console.error('[Sloth] Failed to copy:', err);
        if (options.error) options.error(err);
      });

    return this;
  }

  // ==========================================
  // 12. Intersection Observer
  // ==========================================

  /**
   * Executes a callback when elements enter the visible viewport.
   * @param {string|HTMLElement|NodeList|Array} selector - Elements to observe.
   * @param {Function} handler - Function called with (element, IntersectionObserverEntry).
   * @param {Object} [options={}] - Settings: { once: boolean (default true), margin: string, threshold: number }
   * @returns {Sloth} The Sloth instance for chaining.
   */
  onVisible(selector, handler, options = {}) {
    const config = {
      root: null,
      rootMargin: options.margin || '0px',
      threshold: options.threshold || 0
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          handler(entry.target, entry);
          // By default, stop observing after the first appearance
          if (options.once !== false) {
            obs.unobserve(entry.target);
          }
        }
      });
    }, config);

    // Resolve selector to ensure we have an array/NodeList
    const elements = typeof selector === 'string' 
      ? document.querySelectorAll(selector) 
      : (selector.length !== undefined ? selector : [selector]);

    elements.forEach(el => observer.observe(el));
    
    return this;
  }
}

// Export default instance/class
export default new Sloth();