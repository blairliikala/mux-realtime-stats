export class MuxRealtimeViews extends HTMLElement {
  #token = '';
  #tokenExpiration = {
    'seconds': 0,
    'relative': '',
    'time': {},
  }
  #refresh = 5;
  #showViews = true;
  #showViewers = true;
  #viewsName = 'Watching';
  #viewersName = 'Viewers';
  #viewsdata = {}; // Hold the Mux Realtime response.
  #errorCount = 0; // Count errors.

  // Count up since last check.
  #lastUpdate = {
    'seconds': 0,
    'relative': '',
  };

  #intervals = {};
  #divs = {};
  #slots = {};

  constructor() {
    super();
    window.addEventListener("offline", () => {
      this.stop();
    });
    window.addEventListener("online", () => {
      this.start();
    });
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.start();
      } else {
        this.stop();
      }      
    });
  }

  // Token
  set token(value) {
    this.setAttribute('token', value)
  }
  get token() {
    return this.#token;
  }
  get tokenExpiration() {
    return this.#tokenExpiration;
  }

  // Views
  set views(value) {
    value ? this.setAttribute('views', 'true') : this.removeAttribute('views');
  }
  get views() {
    return this.#viewsdata.data[0]?.views || 0;
  }
  set viewsLabel(value) {
    if (typeof(value) === 'string') this.setAttribute('views-label', value);
  }

  // Viewers
  get viewers() {
    return this.#viewsdata.data[0]?.viewers || 0;
  }
  set viewers(value) {
    value ? this.setAttribute('viewers', 'true') : this.removeAttribute('viewers');
  }
  set viewersLabel(value) {
    if (typeof(value) === 'string') this.setAttribute('viewers-label', value);
  }

  // Ping
  set refresh(value) {
    if (typeof(value) !== 'number') {
      value = Number(value);
      if (isNaN(value)) {
        console.warn('Interval must be a number.')
        return;
      }
    }
    if (value < 5) {
      console.warn('Error: Ping interval must be at or above 5 seconds. Setting to 5 seconds.');
      this.#refresh = 5;
      this.stop();
      this.start();
      return;
    }
    this.#refresh = value;
    this.stop();
    this.start();
  }
  get refresh() {
    return this.#refresh;
  }

  // Misc
  get data() {
    return this.#viewsdata.data[0] || null;
  }
  get errorcount() {
    return this.#errorCount;
  }
  get lastUpdate() {
    return this.#lastUpdate;
  }

  css = `
    <style>
      .realtime_container {
          display:inline-flex;
          gap: 1em;
          --text-color: unset;
          font-size:1em;
        }
        .view_container {
          display: flex;
          position: relative;
          flex-direction: column;
          justify-content: center;
          text-align: center;
          background:rgba(0,0,0,0);
          padding: .5rem;
          border-radius: 50%;
          aspect-ratio: 1 / 1;
        }
        .title {
          text-transform: uppercase;
          opacity:.5;
          font-size:.8rem;
          margin-top:.3rem;
        }
        .data {
          font-size: 1.5rem;
          display: flex;
          justify-content: space-evenly;
          align-items: stretch;
          align-content: center;
        }
        .spacer {
          min-width: 1em;
        }
        .pulseonce {
          box-shadow: 0 0 0 0 rgba(0, 0, 0, 1);
          transform: scale(1);
          animation: pulse-black 2s 1;
        }
        .increase, .decrease {
          animation: toBlack ease 1s;
          animation-iteration-count: 1;
          animation-fill-mode: forwards;
          animation-delay: 1s;
        }
        .increase {
          color: green;
        }
        .decrease {
          color: red;
        }
        .fadeOut {
          animation: fadeOut ease 1s;
          animation-iteration-count: 1;
          animation-fill-mode: forwards;
          animation-delay: 1s;
        }
        @keyframes pulse-black {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
          }
        }

        @keyframes fadeOut {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
        @keyframes toBlack {
          0% {}
          100% {
            color: var(--text-color);
          }
        }
    </style>`;

  init() {
    const template = document.createElement('template');

    template.innerHTML = `
      ${this.css}
      <section class="realtime_container">
        <slot name="views"></slot>
        <slot name="viewers"></slot>
      </section>
    `;

    const html = template.content.cloneNode(true);
    const shadow = this.attachShadow({ mode: 'open' })
    shadow.appendChild(html);

    this.#divs = {
      'root'        : this.shadowRoot?.querySelector('.realtime_container'),
      'views'       : this.shadowRoot?.querySelector('[data-views]'),
      'viewers'     : this.shadowRoot?.querySelector('[data-viewers]'),
      'elapsed'     : this.shadowRoot?.querySelector('[data-elapsed]'),
    }
    this.#slots = {
      'viewsSlot'   : this.shadowRoot?.querySelector('slot[name=views]'),
      'viewersSlot' : this.shadowRoot?.querySelector('slot[name=viewers]'),
    }

    this.create();
  }

  create() {
      if (!this.shadowRoot) return;

      this.#token        = this.getAttribute('token') || '';
      this.#refresh      = Number(this.getAttribute('refresh')) || 5;
      this.#showViews    = this.hasAttribute('views');
      this.#showViewers  = this.hasAttribute('viewers');
      this.#viewsName    = this.getAttribute('views-label') || 'Watching';
      this.#viewersName  = this.getAttribute('viewers-label') || 'Viewers';

      if (!this.#token) {
        console.warn('Please include a token');
        this.#event('error', 'Please include a token', {});
        return;
      }

      const views = this.#divs.root.querySelector('[data-views]');
      if (views) {
        views.parentElement.remove();
      }
      if (this.#showViews) {
          const divViews = document.createElement('div');
          divViews.classList.add('view_container');
          divViews.innerHTML = `
            <span class="data" data-views>
              <span class="spacer" data-icon></span>
              <span data-amount>0</span>
              <span class="spacer"></span>
            </span>
            <span class="title">${this.#viewsName}</span>`;
          this.#divs.root.appendChild(divViews);
          this.#divs.views = this.shadowRoot.querySelector('[data-views]');
      }
      if (!this.#showViews && views) {
        views.parentElement.remove();
      }


      const viewers = this.#divs.root.querySelector('[data-viewers]');
      if (viewers) {
        viewers.parentElement.remove();
      }
      if (this.#showViewers) {
          const divViewers = document.createElement('div');
          divViewers.classList.add('view_container');
          divViewers.innerHTML = `
            <span class="data" data-viewers>
              <span class="spacer" data-icon></span>
              <span data-amount>0</span>
              <span class="spacer"></span>
            </span>
            <span class="title">${this.#viewersName}</span>`;          
          this.#divs.root.appendChild(divViewers);
          this.#divs.viewers = this.shadowRoot.querySelector('[data-viewers]');
      }
      if (!this.#showViewers && viewers) {
        viewers.parentElement.remove();
      }

      if (this.shadowRoot.querySelector('slot[name=views]')) {
        this.#slots.views = this.querySelector('[data-views]');
      }
      if (this.shadowRoot.querySelector('slot[name=viewers]')) {
        this.#slots.viewers = this.querySelector('[data-viewers]');
      }

      this.start();
  }

  async getRealTimeViews() {
      const viewsdata_previous = {...this.#viewsdata};

      if (this.#errorCount > 4) {
        if (this.#errorCount === 10) console.warn('Too many errors, stopping.');
        return;
      }

      if ('online' in navigator && !navigator.onLine) {
        return;
      }

      const { isExpired, timeString } = this.checkJWTExpiration(this.#token);

      if (isExpired) {
        this.#event('expired', `JWT Token expired ${timeString}. Please provide a new token.`, {});
        this.stop();
        return;
      }

      const url = this.getURL(this.#token);
      const data = await this.getData(url);
      if (!data || 'error' in data) this.#event('error', data.error.messages[0], data);

      this.#viewsdata = data;
      this.#event('update', 'Data Updated', this.#viewsdata);
      this.#errorCount = 0;
      this.#lastUpdate.seconds = 0;

      let views       = (this.#viewsdata.data) ? this.#viewsdata.data[0].views : 0;
      let viewers     = (this.#viewsdata.data) ? this.#viewsdata.data[0].viewers : 0;
      let viewsPrev   = (viewsdata_previous.data) ? viewsdata_previous.data[0].views : 0;
      let viewersPrev = (viewsdata_previous.data) ? viewsdata_previous.data[0].viewers : 0;

      if (this.#divs.views)    this.updateDiv(views, viewsPrev, this.#divs.views)
      if (this.#divs.viewers)  this.updateDiv(viewers, viewersPrev, this.#divs.viewers)
      if (this.#slots.views)   this.updateDiv(views, viewsPrev, this.#slots.views)
      if (this.#slots.viewers) this.updateDiv(viewers, viewersPrev, this.#slots.viewers)

      return this.#viewsdata;
  }

  updateDiv(current, old, div) {
    if (!div) return;

    const icon   = div.querySelector('[data-icon]');
    const amount = div.querySelector('[data-amount]');

    if (old != current) {

      div.classList.add('pulseonce');

      if (current > old) {
        div.classList.add('increase');
        if (icon) icon.innerHTML = "+";
        if (icon) icon.classList.add('fadeOut');
        this.#event('increase', 'Increase', {previous: old, current: current, data: this.#viewsdata.data})
      }
      if (current < old) {
        div.classList.add('decrease');
        if (icon) icon.innerHTML = "-";
        if (icon) icon.classList.add('fadeOut');
        this.#event('decrease', 'Decrease', {previous: old, current: current, data: this.#viewsdata.data})
      }

      div.addEventListener('animationend', () => {
        div.classList.remove('pulseonce');
        div.classList.remove('increase');
        div.classList.remove('decrease');
        if (icon) icon.classList.remove('fadeOut');
        if (icon) icon.innerHTML = "";
      });
    }
    if (amount) amount.innerHTML = current;
  }

  async getData(link) {
    if (!link) return;
    return await fetch(link)
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          this.#event('error', 'Unable to get Data.', response);
          this.#errorCount++;
          return;
        }
      })
      .catch(error => {
        this.#event('error', 'Unable to get Data.', error);
        this.#errorCount++;
        return;
      });
  }

  stop() {
    clearInterval(this.#intervals.realtime);
    clearInterval(this.#intervals.clock);
    return 'Refresh Intervals Off.';
  }

  start() {
    this.getRealTimeViews();
    this.#intervals.realtime = setInterval(() => this.getRealTimeViews(), this.#refresh * 1000);
    this.clock();
    this.#intervals.clock = setInterval(() => this.clock(), 1000);
    return 'Refresh Intervals On.';
  }

  clock() {
    this.#lastUpdate.seconds++;
    let now = new Date();

    let offset = now.setSeconds(now.getSeconds() - this.#lastUpdate.seconds);
    this.#lastUpdate.relative = this.#getRelativeTimeDistance(offset) || '';

    const { timeString, expiration } = this.checkJWTExpiration(this.#token);
    this.#tokenExpiration.relative = timeString || '';
    this.#tokenExpiration.time = new Date(expiration);
    this.#tokenExpiration.seconds = Math.round((new Date(expiration) - new Date()) / 1000);
  }

  isURL(string) {
    try {
      return Boolean(new URL(string));
    }
    catch(e){
      return false;
    }
  }

  checkJWTExpiration(token) {
    const jwt = this.parseJwt(token);
    const expiration = new Date(0).setUTCSeconds(jwt.exp);
    const timeString = this.#getRelativeTimeDistance(expiration);
    const isExpired = expiration < new Date();
    return { isExpired, timeString, expiration };
  }

  parseJwt (TOKEN) {
    let jsonPayload = '';
    try {
      const base64Url = TOKEN.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    } catch (error) {
      console.warn(`Token may not be a real token`, TOKEN);
      return;
    }
    return JSON.parse(jsonPayload);
  }

  #getRelativeTimeDistance(d1, d2 = new Date()) {
    const units = {
      year  : 24 * 60 * 60 * 1000 * 365,
      month : 24 * 60 * 60 * 1000 * 365/12,
      day   : 24 * 60 * 60 * 1000,
      hour  : 60 * 60 * 1000,
      minute: 60 * 1000,
      second: 1000
    }
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    const elapsed = d1 - d2;
    for (var u in units)
      if (Math.abs(elapsed) > units[u] || u == 'second')
        return rtf.format(Math.round(elapsed/units[u]),u)
  }

  #event(name, details, object) {
    this.dispatchEvent(new CustomEvent(name, {detail: {"message": details, "full": object}}));
  }

  getURL(token) {
    return `https://stats.mux.com/counts?token=${this.#token}`;
  }

  connectedCallback() {
    this.init();
  }
  disconnectedCallback() {
    this.stop();
  }
  static get observedAttributes () {
    return [
      'token',
      'views',
      'viewers',
      'refresh',
      'views-label',
      'viewers-label',
    ];
  }
  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'token') {
      this.#token = newValue;
      this.#errorCount = 0;
    }
    this.create();
  }

}
customElements.define('mux-realtime-views', MuxRealtimeViews);