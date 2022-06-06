const { ipcRenderer } = require('electron');
const { setTimeout } = require('timers'); // dtls dependency
require('binary-data');                   // dtls dependency
const dtls = require('@nodertc/dtls');
const { Buffer } = require('buffer');

const isElectron = /electron/i.test(navigator.userAgent);
const lights = {};

function hexy(hex) {
  [r, g, b] = hexrgb(hex);
  // Source: https://github.com/ArndBrugman/huepi/blob/gh-pages/huepi.js#L713
  if (r > 0.04045) { r = Math.pow((r + 0.055) / (1.055), 2.4) }
  else { r = r / 12.92 }
  if (g > 0.04045) { g = Math.pow((g + 0.055) / (1.055), 2.4) }
  else { g = g / 12.92 }
  if (b > 0.04045) { b = Math.pow((b + 0.055) / (1.055), 2.4) }
  else { b = b / 12.92 }
  const x = r * 0.664511 + g * 0.154324 + b * 0.162028;
  const y = r * 0.283881 + g * 0.668433 + b * 0.047685;
  const z = r * 0.000088 + g * 0.072310 + b * 0.986039;
  if ((x + y + z) === 0) { return [0, 0] }
  return [x / (x + y + z), y / (x + y + z)];
}

function hexrgb(hex) {
  var rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return [parseInt(rgb[1], 16), parseInt(rgb[2], 16), parseInt(rgb[3], 16)];
}

function blend(c1, c2, fac) {
  c1 = hexrgb(c1);
  c2 = hexrgb(c2);

  let blend = c1.map(function(e, i) {
    let hex = Math.round((c1[i] * (1 - fac)) + (c2[i] * fac)).toString(16);
    if (hex.length == 1) { hex = '0' + hex }
    return hex;
  });

  return '#' + blend.join('');
}

function gradientSlice(colors, fac) {
  if (fac <= 0) { return colors[0] }
  else if (fac >= 1) { return colors[colors.length - 1] }

  else {
    const range = fac * (colors.length - 1);
    const step = Math.floor(range);

    return blend(colors[step], colors[step + 1], range - step);
  }
}

function lightIcon(archetype = '') {
  let icon;
  switch (archetype) {
    case 'sultanbulb':
      icon = 'M16.727 4.047c1.144 1.055.105 2.988-.247 3.68-.94.277-2.453.523-4.48.523-2.031 0-3.54-.246-4.48-.523-.352-.692-1.391-2.625-.247-3.68C8.496 2.926 11.793 3 12 3c.207 0 3.504-.074 4.727 1.047ZM12 9c1.14 0 2.809-.11 4.152-.414-1.015 3.164-1.191 6.059-1.156 6.879a.745.745 0 0 1-.184.52l-.328.374c-.714.086-1.543.141-2.484.141-.941 0-1.77-.055-2.484-.14l-.329-.376a.745.745 0 0 1-.183-.52c.035-.82-.14-3.714-1.16-6.878C9.19 8.89 10.859 9 12 9Zm-2.25 8.145a24.114 24.114 0 0 0 4.504 0l-.375 2.332a.676.676 0 0 1-.227.43l-.347.32a.533.533 0 0 0-.067.066l-.37.437a.766.766 0 0 1-.59.27h-.548a.76.76 0 0 1-.59-.27l-.37-.437a.533.533 0 0 0-.067-.066l-.351-.32a.69.69 0 0 1-.223-.43Zm0 0';
      break;
    case 'huelightstrip':
      icon = 'M6.328 12.5a.756.756 0 0 1 .895.578.754.754 0 0 1-.575.89.756.756 0 0 1-.894-.573.756.756 0 0 1 .574-.895m3.668-.793a.752.752 0 0 1 .316 1.469.75.75 0 0 1-.316-1.469m3.664-.789a.75.75 0 1 1 .315 1.463.75.75 0 0 1-.315-1.463m3.664-.793a.75.75 0 1 1 .322 1.466.75.75 0 0 1-.322-1.466m-9.32 5.355 11.101-2.398a1.497 1.497 0 0 0 1.149-1.781 3.587 3.587 0 0 0-4.262-2.75L4.887 10.945a1.499 1.499 0 0 0-1.149 1.782 3.591 3.591 0 0 0 4.266 2.753M18.75 19.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5m-3.75 0a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5m-3.75 0a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5m-3.75 0a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5m12.75-3H6.75c-3 0-3.75-2.25-3.75-3v3.75C3 19.32 4.68 21 6.75 21h13.5a.75.75 0 0 0 .75-.75v-3a.75.75 0 0 0-.75-.75M16.5 6a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5m-3.75 0a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5M9 6a.75.75 0 1 1 0-1.5A.75.75 0 0 1 9 6M5.25 6a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5m12-3H3.75a.75.75 0 0 0-.75.75v3c0 .414.336.75.75.75h13.5c3 0 3.75 2.25 3.75 3V6.75C21 4.68 19.32 3 17.25 3';
      break;
    case 'hueplay':
      icon = 'M21.733 14.499c-1.597.79-3.167.203-4.216-.21-.868-.342-15.359-6.317-15.359-6.317s-1.337-.597.123-1.127c1.8-.655 3.254-.112 4.934.563l14.132 5.674s1.982.627.386 1.417zm1.512-.667c-.013-.364-.2-1.01-1.273-1.45L6.508 6.171c-.654-.268-1.682-.437-2.677-.437-.514 0-1.25.047-1.839.274-1.04.4-1.25.996-1.275 1.353L.712 7.36l-.006 4.268.004.001c.021.343.207.888 1.095 1.268l15.877 6.53c.596.254 1.382.397 2.207.397.827 0 1.607-.145 2.196-.405 1.016-.45 1.16-1.099 1.157-1.446l.005-4.14z';
      break;
    case 'huebloom':
    case 'hueiris':
    case 'tablewash':
    case 'huego':
      icon = 'M17.152 15.758c-2.894-2.043-6.851-6.004-8.898-8.903-2.074-2.937-1.441-3.73 1.473-1.707 2.957 2.051 7.07 6.168 9.12 9.13 2.028 2.917 1.239 3.554-1.695 1.48m2.723-1.742c-2.086-3.41-6.484-7.809-9.89-9.895-1.614-.988-2.731-1.32-3.258-1.008C4.488 4.93 3 7.97 3 11.078a9.908 9.908 0 0 0 3.629 7.672h-.254c-.617 0-1.125.504-1.125 1.125A1.13 1.13 0 0 0 6.375 21h5.902a.919.919 0 0 0 .211-.023c.145.007.282.023.426.023 3.066 0 6.156-1.527 7.973-3.719.312-.527-.024-1.648-1.012-3.265';
      break;
    case 'groundspot':
    case 'wallspot':
    case 'singlespot':
    case 'doublespot':
      icon = 'M16.313 10.715c-.895.316-2.098-.774-2.68-2.43-.586-1.66-.336-3.258.562-3.574.895-.316 2.094.77 2.68 2.43.586 1.656.332 3.257-.563 3.574m1.965-4.074c-.875-2.43-2.668-4.024-4.004-3.563L5.367 7.223c-1.015.394-1.16 2.398-.32 4.476.844 2.082 2.574 3.563 3.59 3.168l1.117-.41v2.813c-2.195.082-3.961.527-4.395 1.105a.459.459 0 0 0-.105.281v.938c0 .777 2.351 1.406 5.25 1.406 2.898 0 5.246-.629 5.246-1.406v-.938c0-.707-1.957-1.293-4.496-1.39v-3.313l6.184-2.07c1.34-.465 1.714-2.813.84-5.242';
      break;
    default:
      icon = 'M7.18 9.906c1.414.45 3.48.594 4.82.594 1.34 0 3.406-.145 4.82-.594-.574 1.512-1.574 2.184-1.812 3.594-.106.613-.192 1.473-.133 2.102a.738.738 0 0 1-.668.789c-.648.066-1.383.109-2.207.109-.824 0-1.559-.043-2.207-.11a.735.735 0 0 1-.668-.788c.059-.63-.027-1.489-.133-2.102-.238-1.41-1.234-2.082-1.812-3.594Zm2.57 7.242c.781.075 1.64.102 2.25.102.61 0 1.469-.027 2.25-.102l-.375 2.329a.694.694 0 0 1-.227.43l-.347.32a.533.533 0 0 0-.067.066l-.37.437a.76.76 0 0 1-.59.27h-.547a.76.76 0 0 1-.59-.27l-.371-.437a.533.533 0 0 0-.067-.066l-.347-.32a.694.694 0 0 1-.227-.43ZM12 3c2.89 0 5.25 2.5 5.25 4.875 0 .215-.043.406-.063.605a5.267 5.267 0 0 1-.097.528c-.817.347-2.55.742-5.09.742s-4.273-.395-5.09-.742a5.267 5.267 0 0 1-.098-.528c-.019-.199-.062-.39-.062-.605C6.75 5.5 9.11 3 12 3Zm0 0';
  }
  return icon;
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

function triangle(t, a) {
  return Math.abs(((t + a / 2) % a) - a / 2);
}

const HueStream = {
  udpSocket: null,
  streamLoop: null,

  createEntertainmentArea: async function() {
    var bridgeIp = localStorage['bridgeIp'];
    var apiKey = localStorage['apiKey'];

    var groups = await $.get(`http://${bridgeIp}/api/${apiKey}/groups `);

    for (key of Object.keys(groups)) {
      let group = groups[key];

      if (group['name'] == 'HueFX') {
        await $.ajax({
          type: 'PUT',
          url: `http://${bridgeIp}/api/${apiKey}/groups/${key}`,
          data: JSON.stringify({ lights: Object.keys(lights) }),
          dataType: 'json',
          success: function(response) {
            console.log(response);
            localStorage['lightGroup'] = key;
          }
        });
        return;
      }
    }

    await $.ajax({
      type: 'POST',
      url: `http://${bridgeIp}/api/${apiKey}/groups`,
      data: JSON.stringify({
        name: 'HueFX',
        type: 'Entertainment',
        class: 'TV',
        lights: Object.keys(lights)
      }),
      dataType: 'json',
      success: function(response) {
        console.log(response);
        localStorage['lightGroup'] = response[0]['success']['id'];
      }
    });
  },

  streamingMode: async function(state) {
    var bridgeIp = localStorage['bridgeIp'];
    var apiKey = localStorage['apiKey'];

    await $.ajax({
      type: 'PUT',
      url: `http://${bridgeIp}/api/${apiKey}/groups/${localStorage['lightGroup']}`,
      data: JSON.stringify({ stream: { active: state } }),
      dataType: 'json',
      success: function(response) { console.log(response) }
    });
  },

  compilePacket: function() {
    packet = [
      Buffer.from('HueStream', 'ascii'),
      Buffer.from([
        0x01, 0x00, // version
        0x00,       // sequence
        0x00, 0x00, // reserved
        0x01,       // use xy
        0x00        // reserved
      ])
    ]

    let ids = getActiveLights().slice(0, 10); // max 10

    ids.forEach(function(id) {
      packet.push(HueStream.lightBuffer(id));
    })

    return Buffer.concat(packet, 16 + (9 * ids.length));
  },

  lightBuffer: function(id) {
    const arr = new ArrayBuffer(9);
    const view = new DataView(arr);
    const light = lights[id];

    let fac = Math.max(Media.audio[light.bnd] / 255, 0);
    let hex = gradientSlice(lights[id].colors, fac);
    let xy = hexy(hex);

    light.changeLight(hex, light.bri, 0, fac);

    view.setUint8(0, 0);
    view.setUint16(1, parseInt(id));
    view.setUint16(3, parseInt(65535 * xy[0]));
    view.setUint16(5, parseInt(65535 * xy[1]));
    view.setUint16(7, parseInt(65535 * (light.bri / 254)));

    return Buffer.from(arr);
  },

  startUdpSocket: async function() {
    await this.createEntertainmentArea();
    await this.streamingMode(true);

    this.udpSocket = dtls.connect({
      type: 'udp4',
      remotePort: 2100,
      remoteAddress: localStorage['bridgeIp'],
      pskIdentity: localStorage['apiKey'],
      pskSecret: Buffer.from(localStorage['clientKey'], 'hex'),
      cipherSuites: ['TLS_PSK_WITH_AES_128_GCM_SHA256']
    })

    this.udpSocket.on('error', function(err) {
      HueStream.udpSocket = null;
      console.error(err);
    });

    this.udpSocket.once('connect', function() {
      console.log('Connected to Hue Stream');

      HueStream.streamLoop = setInterval(function() {
        Media.updateAudioAvg();
        let packet = HueStream.compilePacket();
        HueStream.udpSocket.write(packet);
      }, 20);
    });
  },

  stopUdpSocket: async function() {
    await this.udpSocket.close();
    this.udpSocket = null;

    if (this.streamLoop) {
      clearInterval(this.streamLoop);
      this.streamloop = null;
    }
    await this.streamingMode(false);
    console.log('Disconnected Hue Stream');
  }
}

const Media = {
  stream: null,
  audio: [0, 0, 0, 0],
  video: {
    center: '#808000',
    top: '#80FF00',
    bottom: '#800000',
    left: '#008000',
    right: '#FF8000'
  },

  startMediaStream: async function() {
    const config = {
      audio: {
        mandatory: {
          chromeMediaSource: 'desktop'
        }
      },
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          minWidth: 16, maxWidth: 16,
          minHeight: 9, maxHeight: 9
        }
      }
    }
    this.stream = await navigator.mediaDevices.getUserMedia(config);
    console.log(this.stream.getTracks());

    this.initAudioAnalyser();
  },

  stopMediaStream: function() {
    if (this.stream != null) {
      this.stream.getTracks().forEach(function(track) {
        track.stop();
      });
      this.stream = null;
      this.updateAudioAvg = null;
    }
  },

  updateFrameAvg: function() {
    const video = document.querySelector('video');
    video.srcObject = this.stream;
    video.onloadedmetadata = (e) => video.play();
    // await new Promise(r => video.onloadedmetadata = r);

    const canvas = document.getElementById('canvas-input');
    const ctx = canvas.getContext('2d');

    function average() {
      ctx.drawImage(video, -1, 0, 17, 9);

      // let data = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // requestAnimationFrame(average);
    }

    requestAnimationFrame(average);
  },

  initAudioAnalyser: function() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 10000 });
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 32;
    analyser.minDecibels = -70;
    analyser.maxDecibels = -10;

    const source = ctx.createMediaStreamSource(this.stream);
    source.connect(analyser);

    let data = new Uint8Array(analyser.frequencyBinCount);

    this.updateAudioAvg = function() {
      analyser.maxDecibels = parseInt((1 - (lights[1].vol / 100)) * -50);
      analyser.smoothingTimeConstant = lights[1].smt;
      analyser.getByteFrequencyData(data);

      Media.audio[0] = parseInt(Math.min(data.slice(0, 12).reduce((a, b) => a + b, 0) / 8, 255));
      Media.audio[1] = parseInt(data.slice(0, 2).reduce((a, b) => Math.max(a, b), 0));
      Media.audio[2] = parseInt(data.slice(2, 5).reduce((a, b) => Math.max(a, b), 0));
      Media.audio[3] = parseInt(data.slice(5, 10).reduce((a, b) => Math.max(a, b), 0));
    }
  },

  updateAudioAvg: null // created by initAudioAnalyser
}

class Light {
  constructor(id, info) {
    this.id = id;
    this.info = info;
    this.playing = false;
    this.loop = null;

    if (localStorage[id] === (null || undefined)) {
      localStorage[id] = JSON.stringify({});
    }

    const prefs = JSON.parse(localStorage[id]);

    this.mode = prefs.mode || 'cycle'; // light mode
    this.bri = info.state.bri;         // light brightness
    this.spd = prefs.spd || 30;        // cycle speed
    this.dir = prefs.dir || 'forward'; // cycle motion
    this.reg = prefs.reg || 'center';  // video region
    this.bnd = prefs.bnd || '0'        // audio band
    this.smt = prefs.smt || 0.85;      // audio smoothing
    this.vol = prefs.vol || 80;        // audio peak volume

    this.color = prefs.color || '#f4bf75';
    this.colors = prefs.colors || ['#ac4142', '#f4bf75', '#6a9fb5'];
  }

  storePrefs() {
    const prefs = {
      mode: this.mode,
      bri: this.bri,
      spd: this.spd,
      dir: this.dir,
      reg: this.reg,
      bnd: this.bnd,
      smt: this.smt,
      vol: this.vol,

      color: this.color,
      colors: this.colors
    }

    localStorage[this.id] = JSON.stringify(prefs);
  }

  createElement() {
    const colors = [];

    if (this.mode == 'color') {
      const element =
        `<label class="color" style="background-color:${this.color}">
          <input type="color" value="${this.color}">
        </label>`;
      colors.push(element);
    }

    else {
      this.colors.forEach(function(color) {
        const element =
          `<label class="color" style="background-color:${color}">
            <input type="color" value="${color}">
          </label>`;
        colors.push(element);
      })
    }

    const light =
      `<div id="${this.id}" class="light">

        <div class="info">
          <div class="overlay"></div>

          <div style="display:flex;">
            <svg viewBox="2 2 21 21" xmlns="http://www.w3.org/2000/svg" style="fill:#c5c8c6;">
              <title>${this.info.productname + '\n' + this.info.productid}</title>
              <path d="${lightIcon(this.info.config.archetype)}"/></svg>

              <div >
                <div style="display:flex;align-items:flex-start;">
                  <span class="light-name">${this.info.name}</span>
                  <span class="light-id">${'#' + (this.id.length < 2 ? '0' + this.id : this.id)}</span>
                </div>

                <span class=light-id>${this.info.state.reachable ? 'Connected' : 'Not Reachable'}</span>
              </div>
          </div>

          <div style="display:flex;">
            <div style="display:flex;">
              <select class="mode indent" style="border-radius:6px 0 0 6px;border-right:none" title="Effect Type">
                <option value="color" ${this.mode == 'color' ? 'selected' : ''} title="Set light to selected color">Color</option>
                <option value="cycle" ${this.mode == 'cycle' ? 'selected' : ''} title="Smoothly loop between selected colors">Cycle</option>
                <option value="audio" ${this.mode == 'audio' ? 'selected' : ''} title="Audio-responsive gradient progress" ${isElectron ? '' : 'disabled'}>Audio</option>
              </select>
              <button type="button" class="start" style="border-radius:0 6px 6px 0;" title="Start"
                ${this.info.state.reachable ? '' : 'disabled '}
                ${this.playing ? 'enabled>■' : '>⯈'}</button>
            </div>
            <button type="button" class="dropdown" title="Expand"><span>🡣</span></button>
            <button type="button" class="preset" title="Presets"
              style="background: conic-gradient(${[...this.colors, this.colors[0]].join(',')})"
              data-colors='${JSON.stringify(this.colors)}'>
            </button>
          </div>
        </div>

        <div class="config">

          <div class="colors">
            <div class="progress"></div>
            <div class="gradient" style="background: linear-gradient(90deg, ${this.colors.join(', ')})"></div>
            ${colors.join('')}

            <div style="display:flex;max-width:0;">
              <button class="remove" type="button" title="Remove Color">–</button>
              <button class="add" type="button" title="Add Color">+</button>
            </div>

          </div>

          <form class="options">

            <div class="option option-bri">
              <label class="option-name">Brightness:</label>
              <input type="range"  min="0" max="254" step="1" value="${this.bri}">
              <input type="number" min="0" max="254" step="1" value="${this.bri}">
            </div>

            <div class="option option-spd">
              <label class="option-name">Speed:</label>
              <input type="range"  min="${this.colors.length}" max="240" step="1" value="${this.spd}">
              <input type="number" min="${this.colors.length}" max="240" step="1" value="${this.spd}">
            </div>

            <div class="option option-dir" style="justify-content:flex-start;">
              <label class="option-name">Motion:</label>
              <div style="width:60%;display:flex;margin:0 8px;">
                <label class="radio left ${this.dir == 'forward' ? 'enabled' : ''}">Forward
                  <input type="radio" name="dir" value="forward" ${this.dir == 'forward' ? 'checked' : ''}>
                </label>
                <label class="radio center ${this.dir == 'bounce' ? 'enabled' : ''}">Bounce
                  <input type="radio" name="dir" value="bounce" ${this.dir == 'bounce' ? 'checked' : ''}>
                </label>
                <label class="radio right ${this.dir == 'reverse' ? 'enabled' : ''}">Reverse
                  <input type="radio" name="dir" value="reverse" ${this.dir == 'reverse' ? 'checked' : ''}>
                </label>
              </div>
            </div>

            <div class="option option-smt">
              <label class="option-name">Smoothing:</label>
              <input type="range"  min="0.5" max="0.99" step="0.01" value="${this.smt}">
              <input type="number" min="0.5" max="0.99" step="0.01" value="${this.smt}">
            </div>

            <div class="option option-vol">
              <label class="option-name">Volume:</label>
              <input type="range"  min="0" max="100" step="1" value="${this.vol}">
              <input type="number" min="0" max="100" step="1" value="${this.vol}">
            </div>

            <div class="option option-reg" style="justify-content:flex-start;">
              <label class="option-name">Region:</label>
              <div style="width:60%;display:flex;margin:0 8px;">
                <label class="radio left ${this.reg == 'center' ? 'enabled' : ''}" title="Center">▣
                  <input type="radio" name="reg" value="center" ${this.reg == 'center' ? 'checked' : ''}>
                </label>
                <label class="radio center ${this.reg == 'left' ? 'enabled' : ''}" title="Left">◧
                  <input type="radio" name="reg" value="left" ${this.reg == 'left' ? 'checked' : ''}>
                </label>
                <label class="radio center ${this.reg == 'top' ? 'enabled' : ''}" title="Top">⬒
                  <input type="radio" name="reg" value="top" ${this.reg == 'top' ? 'checked' : ''}>
                </label>
                <label class="radio center ${this.reg == 'bottom' ? 'enabled' : ''}" title="Bottom">⬓
                  <input type="radio" name="reg" value="bottom" ${this.reg == 'bottom' ? 'checked' : ''}>
                </label>
                <label class="radio right ${this.reg == 'right' ? 'enabled' : ''}" title="Right">◨
                  <input type="radio" name="reg" value="right" ${this.reg == 'right' ? 'checked' : ''}>
                </label>
              </div>
            </div>

            <div class="option option-bnd" style="justify-content:flex-start;">
              <label class="option-name">Frequency:</label>
              <div style="width:60%;display:flex;margin:0 8px;">
                <label class="radio left ${this.bnd == '0' ? 'enabled' : ''}">All
                  <input type="radio" name="bnd" value="0" ${this.bnd == '0' ? 'checked' : ''}>
                </label>
                <label class="radio center ${this.bnd == '1' ? 'enabled' : ''}">Low
                  <input type="radio" name="bnd" value="1" ${this.bnd == '1' ? 'checked' : ''}>
                </label>
                <label class="radio center ${this.bnd == '2' ? 'enabled' : ''}">Mid
                  <input type="radio" name="bnd" value="2" ${this.bnd == '2' ? 'checked' : ''}>
                </label>
                <label class="radio right ${this.bnd == '3' ? 'enabled' : ''}">High
                  <input type="radio" name="bnd" value="3" ${this.bnd == '3' ? 'checked' : ''}>
                </label>
              </div>
            </div>

        </form>
      </div>

    </div>`;

    let test = $(light);
    test.on('click', function() { $(this).css('background-color', 'blue') });
    return test;
  }

  changeLight(color, bri, time, progress = 0) {
    const bridgeIp = localStorage['bridgeIp'];
    const apiKey = localStorage['apiKey'];
    const isHex = (typeof (color) == 'string');

    if (time != 0) {
      let data = {
        'xy': typeof (color) == 'object' ? color : hexy(color),
        'bri': bri,
        'transitiontime': time * 10
      }

      $.ajax({
        type: 'PUT',
        url: `http://${bridgeIp}/api/${apiKey}/lights/${this.id}/state`,
        data: JSON.stringify(data),
        dataType: 'json',
        // success: function(response) { console.log(response) }
      });

      $(`#${this.id} .progress`).stop().animate({
        left: (progress * 100) + '%'
      }, {
        duration: time * 1000,
        easing: 'linear',
        queue: false
      });
    }

    else {
      $(`#${this.id} .progress`).css({
        transition: 'none',
        left: (progress * 100) + '%'
      });
    }

    $(`#${this.id} svg`).css({
      transition: time + 's',
      fill: isHex ? color : '',
      opacity: bri / 254
    });

    $(`#${this.id} .overlay`).css({
      transition: time + 's',
      background: isHex ? `radial-gradient(circle at top left, ${color}, transparent 60%)` : ''
    });
  }

  startCycle() {
    const self = this;
    let step = 0;

    function loop() {
      if (!self.playing) { self.stopCycle(); return; }
      let index = step;

      switch (self.dir) {
        default:
        case 'forward': index = mod(step, self.colors.length); break;
        case 'bounce': index = triangle(mod(step, self.colors.length * 2), (self.colors.length * 2) - 2); break;
        case 'reverse': index = (self.colors.length - 1) - mod(step, self.colors.length); break;
      }

      self.changeLight(
        self.colors[index],
        self.bri,
        (self.spd / self.colors.length),
        (index / (self.colors.length - 1))
      );

      self.loop = setTimeout(loop, (self.spd / self.colors.length) * 1000);
      step++;
    }

    loop();
  }

  stopCycle() {
    clearTimeout(this.loop);
    this.playing = false;
    this.loop = null;

    this.changeLight(
      this.info.state.xy,
      this.info.state.bri,
      (this.spd / this.colors.length) / 4
    );
  }

  updateColors(inputs = true) {
    let colors = this.mode != 'color' ? this.colors : [this.color];
    let light = $('#' + this.id);

    light.find('.gradient')
      .css('background', `linear-gradient(90deg, ${colors.length > 1 ? colors.join(',') : colors[0] + ',' + colors[0]})`);

    light.find('.preset').add($('#presets .active .preset').eq(this.id - 1))
      .css('background', `conic-gradient(${[...colors, colors[0]].join(',')})`)
      .data('colors', colors);

    if (inputs && colors.length != light.find('.color').length) {
      let expanded = light.find('.color').hasClass('color-expanded');
      light.find('.color').remove();

      colors.forEach(function(color) {
        let element =
          `<label class="color ${expanded ? 'color-expanded' : ''}" style="background-color:${color}">
              <input type="color" value="${color}">
            </label>`;
        light.find('.add').parent().before(element);
      })

      light.find('.option-spd input').attr('min', colors.length);
    }

    else {
      colors.map(function(color, i) {
        light.find('.color').eq(i).css('background-color', color);
        light.find('.color input').eq(i).val(color);
      })
    }
  }
}

function getLight(el) {
  return lights[$(el).parents('.light').attr('id')];
}

function getActiveLights() {
  let active = [];
  for (key in lights) {
    let light = lights[key];
    if (
      light.playing &&
      light.info.state.reachable &&
      ['audio', 'video'].includes(light.mode)
    ) {
      active.push(light.id);
    }
  }
  return active;
}

function updatePresets() {
  if (localStorage['presets'] === (null || undefined)) {
    const defaults = [
      ['#ac4142', '#f4bf75', '#6a9fb5'],
      ['#e17761', '#f9c68d', '#f9e9a4', '#c8e394', '#86dbb1'],
      ['#fa9eaa', '#fac8be', '#faeec8', '#7dc4ca', '#43888e'],
      ['#f6bb93', '#fba490', '#fb897a', '#fc666f', '#b83253', '#651b40'],
      ['#5391ae', '#85b464', '#e2d269', '#ea915e', '#bc677b', '#7a4e8a'],
      ['#545588', '#678fa9', '#9edfce', '#c0efc7'],
      // ['#f320fa', '#c74bf6', '#9a75f0', '#6e9eeb', '#41c8e5', '#14f2e0'],
    ];
    localStorage['presets'] = JSON.stringify(defaults);
  }

  $('#presets .custom .preset').remove();

  JSON.parse(localStorage['presets']).forEach(function(colors) {
    let preset = `<button type="button" class="preset" style="background: conic-gradient(${[...colors, colors[0]].join(',')})" data-colors='${JSON.stringify(colors)}'></button>`;

    $('#presets #add-preset').before(preset);
  });
}

async function initInterface() {
  const bridgeIp = localStorage['bridgeIp'];
  const apiKey = localStorage['apiKey'];
  const bridgeConfig = await $.get(`http://${bridgeIp}/api/${apiKey}/config`);
  $('#status span').html(`Connected to Bridge: ${bridgeConfig['name']} (${bridgeIp})`);
  $('#start-all, #refresh').prop('disabled', false);

  let lightlist = await $.get(`http://${bridgeIp}/api/${apiKey}/lights`);
  for (key in lightlist) { lights[key] = new Light(key, lightlist[key]) };
  console.log(lights);

  $('.placeholder').remove();

  for (id in lights) {
    $('#presets .active').append('<button type="button" class="preset"></button>');
    $('#lights').append(lights[id].createElement());
    lights[id].updateColors(true);
  }

  updatePresets();
  return;
}

async function authorizeBridge() {
  if (localStorage['apiKey'] === (null || undefined)) {
    const ips = await $.get('https://discovery.meethue.com/');

    if (ips != []) {
      const bridgeIp = ips[0]['internalipaddress'];
      localStorage['bridgeIp'] = bridgeIp;

      let request = async function() {
        const userid = await $.post(`http://${bridgeIp}/api`, JSON.stringify({ "devicetype": "HueFX#TF", "generateclientkey": true }), dataType = 'json');
        // console.log(userid);

        if ('success' in userid[0]) {
          window.clearInterval(loop);
          localStorage['apiKey'] = userid[0]['success']['username'];
          localStorage['clientKey'] = userid[0]['success']['clientkey'];

          location.reload(); // TEMP FIX
          // await initInterface();
          return
        }
      }
      let loop = window.setInterval(request, 4000);
      $('#status span').html(`Bridge found at ${bridgeIp}.<br>Please press the button on your bridge.`);
    }
    else { $('#status span').html('No bridge found!') }

  }

  else { await initInterface(); return }
}

async function main() {
  ipcRenderer.on('close', async function() {
    if (HueStream.udpSocket) { await HueStream.stopUdpSocket() }
    if (Media.stream) { await Media.stopMediaStream() }
  });

  $('#exit').on('click', function() {
    window.close();
  })

  $('#refresh').on('click', async function() {
    if (HueStream.udpSocket) { await HueStream.stopUdpSocket() }
    if (Media.stream) { await Media.stopMediaStream() }
    location.reload();
  });

  await authorizeBridge();

  $('.options').hide();

  $('.dropdown').on('click', function() {
    $(this).children('span').toggleClass('rotate');
    const main = $(this).parents('.light');
    main.find('.add, .remove').toggle();
    main.find('.color').toggleClass('color-expanded');
    main.find('.gradient').toggleClass('gradient-back');
    main.find('.options').slideToggle(250);
    main.find('.progress').fadeToggle({ duration: 100, queue: false });
  });

  $('.colors').hover(
    function() {
      $(this).find('.add').parent().stop().animate({ 'max-width': '60px' }, 150);
    },
    function() {
      setTimeout(() => { $(this).find('.add').parent().stop().animate({ 'max-width': '0px' }, 150) }, 250);
    });

  $('.add').on('click', function() {
    let light = getLight($(this));
    let colors = light.colors;

    if (colors.length <= 10) {
      light.colors = [...colors, colors[colors.length - 1]];
      light.updateColors(true);
      light.storePrefs();
    }
  });

  $('.remove').on('click', function() {
    let light = getLight($(this));

    if (light.colors.length > 2) {
      light.colors.pop();
      light.updateColors(true);
      light.storePrefs();
    }
  });

  $('.light').on('input', '.color input', function() {
    let values = $(this).parents('.colors').find('input').map(function() { return $(this).val() }).get();
    let light = getLight($(this));

    light.mode == 'color' ?
      light.color = values[0] :
      light.colors = values;

    light.updateColors(false);
    light.storePrefs();
  });

  $('.option:not(.option-smt, .option-vol) input').on('input', function() {
    $(this).parent().find('input').val($(this).val());
  });

  $('.option input').on('change', function() {
    let light = getLight($(this));
    let config = $(this).parents('.config');
    light.bri = parseInt(config.find('.option-bri input').val());
    light.spd = parseInt(config.find('.option-spd input').val());
    light.smt = parseFloat(config.find('.option-smt input').val());
    light.vol = parseInt(config.find('.option-vol input').val());

    light.dir = config.find('.option-dir input:checked').val();
    light.reg = config.find('.option-reg input:checked').val();
    light.bnd = config.find('.option-bnd input:checked').val();
    config.find('.radio').removeClass('enabled');
    config.find('.radio input:checked').parent().addClass('enabled');

    light.storePrefs();
  });

  $('.option-smt input').on('input', function() {
    $('.option-smt input').val($(this).val()).change();
  });

  $('.option-vol input').on('input', function() {
    $('.option-vol input').val($(this).val()).change();
  });

  $('#lights .preset').on('click', function() {
    let content = $('#content');

    isElectron ? $('#filter').fadeIn(150) : {};
    $('#presets').fadeIn(150)
      .css('top', $(this).offset().top - 34)  // -20
      .css('left', !isElectron ? (content.offset().left + content.width() + 36) : '')
      .data('target', getLight($(this)).id);
  });

  $(document).on('mouseup', function(e) {
    if ($('#presets').is(":visible") && $(e.target).closest("#presets").length === 0) {
      $('#presets').fadeOut(150);
      $('#filter').fadeOut(150);
    }
  });

  $('#presets').on('click', '.preset', function() {
    let id = $('#presets').data('target');
    let colors = $(this).data('colors');
    let light = lights[id];

    light.mode == 'color' ?
      light.color = $(this).data('colors')[0] :
      light.colors = $(this).data('colors');

    light.updateColors();
    light.storePrefs();
    $('#presets').fadeOut(150);
    $('#filter').fadeOut(150);
  });

  $('#add-preset').on('click', function() {
    let id = $(this).parents('#presets').data('target');
    let presets = JSON.parse(localStorage['presets']);
    let colors = $('#' + id).find('.preset').data('colors');

    localStorage['presets'] = JSON.stringify([...presets, colors]);
    updatePresets();
  });

  $('#clear-presets').on('click', function() {
    localStorage.removeItem('presets');
    updatePresets();
  });

  $('.mode').on('change', function() {
    let main = $(this).parents('.light');
    let light = lights[main.attr('id')];

    light.mode = $(this).val();
    main.find('.option').hide();

    switch (light.mode) {
      case 'color':
        main.find('.option-bri').show();
        break;

      case 'cycle':
        main.find('.option-bri, .option-spd, .option-dir').show();
        break;

      case 'audio':
        main.find('.option-bri, .option-smt, .option-bnd, .option-vol').show();
    }
    light.updateColors();
    light.storePrefs();
  });
  $('.mode').change();

  $('.start').on('click', async function() {
    let light = getLight($(this));

    if (light.mode == 'color') {
      light.changeLight(light.color, light.bri, 1);
    }

    else {
      if (light.playing) {
        light.playing = false;
        $(this).removeClass('enabled').html('⯈').attr('title', 'Start');

        if (getActiveLights().length == 0) {
          $('#start-all').removeClass('enabled').html('⯈ Start All');
        }

        switch (light.mode) {

          case 'cycle':
            light.stopCycle();
            return;

          case 'audio':
            if (getActiveLights().length == 0) {
              if (HueStream.udpSocket) { await HueStream.stopUdpSocket() }
              if (Media.stream) { await Media.stopMediaStream() }
            }

            setTimeout(function() {
              light.changeLight(
                light.info.state.xy,
                light.info.state.bri,
                2
              )
            }, 100);
            return;
        }
      }
      else {
        if (getActiveLights().length == lights.length) {
          $('#start-all').addClass('enabled').html('■ Stop All');
        }

        switch (light.mode) {

          case 'cycle':
            light.playing = true;
            light.startCycle();
            $(this).addClass('enabled').html('■').attr('title', 'Stop');
            return;

          case 'audio':
            light.playing = true;
            if (!Media.stream) { await Media.startMediaStream() }
            if (!HueStream.udpSocket) { await HueStream.startUdpSocket() }
            $(this).addClass('enabled').html('■').attr('title', 'Stop');
            return;
        }
      }
    }
  });

  $('#start-all').on('click', function() {
    if ($(this).hasClass('enabled')) {
      $(this).removeClass('enabled').html('⯈ Start All');
      $('.start.enabled').click();
    }
    else {
      $(this).addClass('enabled').html('■ Stop All');
      $('.start:enabled:not(.enabled)').click();
    }
  });
}

if (!isElectron) { $('body').css({ 'background-color': '#3d3d3d', 'padding': '12px' }) }
main();
