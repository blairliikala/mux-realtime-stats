class MuxRealtimeViews extends HTMLElement {
  #api = '';
  #pinginterval = 5000;
  #showViews = true;
  #showViewers = true;
  #viewsName = 'Watching';
  #viewersName = 'Viewers';
  #viewsdata = {}; // Hold the Mux Realtime response.
  #secondsAgo = 0; // Count up since last check.
  #errorCount = 0; // Count errors.

  #intervals = {};
  #divs = {};
  #slots = {};

  constructor() {
    super();

    window.addEventListener("offline", () => {
      console.log('offline');
      clearInterval(this.#intervals.realtime);
      clearInterval(this.#intervals.clock);
    });

    window.addEventListener("online", () => {
      this.#intervals.realtime = setInterval( () => this.getRealTimeViews(), this.#pinginterval);
      this.#intervals.clock = setInterval( () => this.clock(), 1000);
      console.log('online.');
    });
  }

  set api(value) {
    if (this.isURL(value)) {
      this.setAttribute('api', value)
    } else {
      console.debug(`"${value}" is not a valid URL.`);
    }
  }

  // Views
  set views(value) {
    value ? this.setAttribute('views', 'true') : this.removeAttribute('views');
  }
  get views() {
    return this.#viewsdata.data[0]?.views || 0;
  }

  // Viewers
  get viewers() {
    return this.#viewsdata.data[0]?.viewers || 0;
  }
  set viewers(value) {
    value ? this.setAttribute('viewers', 'true') : this.removeAttribute('viewers');
  }

  // Ping
  set pinginterval(value) {
    if (value < 5000) {
      console.log('Ping interval must be above 5,000 (5 seconds)');
      return;
    }
    this.#pinginterval = value;
    clearInterval(this.#intervals.realtime);
    this.getRealTimeViews();
    this.#intervals.realtime = setInterval( () => this.getRealTimeViews(), this.#pinginterval);
  }
  get pinginterval() {
    return this.#pinginterval;
  }

  // Misc
  get data() {
    return this.#viewsdata.data[0] || null;
  }
  get errorcount() {
    return this.#errorCount;
  }
  get lastUpdate() {
    return this.#secondsAgo;
  }

  css = `
      <style>
          .realtime_container {
              display:inline-flex;
              display: grid;
              justify-content: center;
              justify-items: center;
              grid-auto-flow: column;
              align-items: stretch;
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
              color:green;
            }
            .decrease {
              color:red;
            }

            .increase:before, .decrease:before {
              margin:0;
              padding:0;
              position:absolute;
              left:.3rem;
              top:.9rem;
              animation: fadeOut ease 1s;
              animation-iteration-count: 1;
              animation-fill-mode: forwards;
              animation-delay: 1s;
            }
            .increase:before {
              content: '+';
            }
            .decrease:before {
              content: '-';
              /*transform: rotate(180deg);*/
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
      </style>`

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

      this.#api          = this.getAttribute('api');
      this.#pinginterval = Number(this.getAttribute('pinginterval')) || 5000;
      this.#showViews    = this.hasAttribute('views');
      this.#showViewers  = this.hasAttribute('viewers');
      this.#viewsName    = this.getAttribute('views-label') || 'Watching';
      this.#viewersName  = this.getAttribute('viewers-label') || 'Viewers';

      if (!this.#api || this.#api === '' || !this.isURL(this.#api)) {
          console.debug('Please include the api="[url]" parameter.');
          return;
      }

      const views = this.#divs.root.querySelector('[data-views]');
      if (this.#showViews && !views) {
          const divViews = document.createElement('div');
          divViews.classList.add('view_container');
          divViews.innerHTML = `<span class="data" data-views>0</span><span class="title">${this.#viewsName}</span>`;
          this.#divs.root.appendChild(divViews);
          this.#divs.views = this.shadowRoot.querySelector('[data-views]');
      }
      if (!this.#showViews && views) {
        views.parentElement.remove();
      }

      const viewers = this.#divs.root.querySelector('[data-viewers]');
      if (this.#showViewers && !viewers) {
          const divViewers = document.createElement('div');
          divViewers.classList.add('view_container');
          divViewers.innerHTML = `<span class="data" data-viewers>0</span><span class="title">${this.#viewersName}</span>`;
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

      this.getRealTimeViews();
      clearInterval(this.#intervals.realtime);
      this.#intervals.realtime = setInterval( () => this.getRealTimeViews(), this.#pinginterval);

      this.clock();
      clearInterval(this.#intervals.clock);
      this.#intervals.clock = setInterval( () => this.clock(), 1000);
  }

  async getRealTimeViews() {
      const viewsdata_previous = {...this.#viewsdata};

      if (this.#errorCount > 4) {
        if (this.#errorCount === 10) console.debug("Too many errors, stopping.");
        return;
      }

      if ('online' in navigator && !navigator.onLine) {
        return;
      }

      const data = await this.getData(this.#api);
      if (!data || 'error' in data) return;

      this.#viewsdata = data;
      this.dispatchEvent(new CustomEvent('update', {detail: this.#viewsdata}));
      this.#errorCount = 0;
      this.#secondsAgo = 0;

      let views       = (this.#viewsdata.data) ? this.#viewsdata.data[0].views : 0;
      let viewers     = (this.#viewsdata.data) ? this.#viewsdata.data[0].viewers : 0;
      let viewsPrev   = (viewsdata_previous.data) ? viewsdata_previous.data[0].views : 0;
      let viewersPrev = (viewsdata_previous.data) ? viewsdata_previous.data[0].viewers : 0;

      if (this.#divs.views)    this.updateDiv(views, viewsPrev, this.#divs.views)
      if (this.#divs.viewers)  this.updateDiv(viewers, viewersPrev, this.#divs.viewers)
      if (this.#slots.views)   this.updateDiv(views, viewsPrev, this.#slots.views)
      if (this.#slots.viewers) this.updateDiv(viewers, viewersPrev, this.#slots.viewers)

  }

  updateDiv(current, old, div) {
    if (!div) return;

    if (old != current) {

      div.classList.add('pulseonce');

      if (current > old) {
        div.classList.add('increase');
        this.dispatchEvent(new CustomEvent('increase', {detail: this.#viewsdata}));
      }
      if (current < old) {
        div.classList.add('decrease');
        this.dispatchEvent(new CustomEvent('decrease', {detail: this.#viewsdata}));
      }

      div.addEventListener('animationend', () => {
        div.classList.remove('pulseonce')
        div.classList.remove('increase')
        div.classList.remove('decrease')
      });
    }
    div.innerHTML = current;
  }

  async getData(link) {
    try {
      const res = await fetch(link);
      if (!res.ok) {
        switch(true) {
          // Token may have expired.
          case res.status === 403 :
            console.debug("Token may have expired.", res.statusText, res.status);
            this.dispatchEvent(new CustomEvent('error', { detail: { "message" :"Token may have expired.", "text" : res.statusText, "status" : res.status} }));
            this.#errorCount++;
            return;

          default:
            console.debug("Error getting real-time stats.", res.statusText, res.status);
            this.dispatchEvent(new CustomEvent('error', { detail: { "message" :"Unable to get data", "text" : res.statusText, "status" : res.status} }));
            this.#errorCount++;
            return;
        }
      }
      return await res.json();
    } catch(error) {
      this.dispatchEvent(new CustomEvent('error', { detail: { "message" :"Unable to get data"}}));
      console.debug(error);
      this.#errorCount++;
      return false;
    }
  }

  clock() {
    this.#secondsAgo++;

    if (this.#divs?.elapsed) {
      this.#divs.elapsed.innerHTML = this.#secondsAgo;
    }
  }

  isURL(string) {
    try {
      return Boolean(new URL(string));
    }
    catch(e){
      return false;
    }
  }

  connectedCallback() {
    this.init();
  }
  disconnectedCallback() {
    clearInterval(this.#intervals.realtime);
    clearInterval(this.#intervals.clock);
  }
  static get observedAttributes () {
    return ['api', 'views', 'viewers', 'pinginterval', 'views-label', 'viewers-label'];
  }
  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'api') {
      this.#api = newValue;
      this.#errorCount = 0;
    }
    if (name === 'viewers') this.#showViewers = newValue;
    if (name === 'views') this.#showViews = newValue;
    if (name === 'pinginterval') this.#pinginterval = newValue;

    if (name === 'views-label') this.#viewsName = newValue;
    if (name === 'viewers-label') this.#viewersName = newValue;

    this.create();
  }

}
customElements.define('mux-realtime-views', MuxRealtimeViews);