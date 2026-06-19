/**
 * ねぎさん用組版ツール - Core Application Logic
 * Refactored into a Class-based architecture for maintainability.
 */

// ==========================================
// 1. SettingsManager: Handles persistence and I/O
// ==========================================
class SettingsManager {
    constructor(inputs) {
        this.inputs = inputs;
        this.storageKey = 'typesetSettings';
    }

    /** Save current input values to LocalStorage */
    save() {
        const settings = {};
        this.inputs.forEach(input => {
            if (input.id) {
                settings[input.id] = input.type === 'checkbox' ? input.checked : input.value;
            }
        });
        localStorage.setItem(this.storageKey, JSON.stringify(settings));
    }

    /** Load saved values from LocalStorage */
    load() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.inputs.forEach(input => {
                    if (input.id && settings[input.id] !== undefined) {
                        if (input.type === 'checkbox') {
                            input.checked = settings[input.id];
                        } else {
                            input.value = settings[input.id];
                        }
                    }
                });
            } catch (e) {
                console.error("Failed to load settings from LocalStorage", e);
            }
        }
    }

    /** Export settings as a JSON file */
    exportJSON() {
        const settings = {};
        this.inputs.forEach(input => {
            if (input.id) {
                settings[input.id] = input.type === 'checkbox' ? input.checked : input.value;
            }
        });
        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `preset_${Date.now()}.json`;
        link.click();
    }

    /** Import settings from a JSON file */
    importJSON(file, onComplete) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const settings = JSON.parse(evt.target.result);
                this.inputs.forEach(input => {
                    if (input.id && settings[input.id] !== undefined) {
                        if (input.type === 'checkbox') {
                            input.checked = settings[input.id];
                        } else {
                            input.value = settings[input.id];
                        }
                    }
                });
                alert('プリセットを読み込みました！');
                if (onComplete) onComplete();
            } catch (err) {
                console.error('Import failed:', err);
                alert('ファイルの読み込みに失敗しました。形式が正しいか確認してください。');
            }
        };
        reader.readAsText(file);
    }
}


// ==========================================
// 2. FontManager: Handles local font API
// ==========================================
class FontManager {
    constructor(btnId, presetListId) {
        this.loadBtn = document.getElementById(btnId);
        this.presetList = document.getElementById(presetListId);
        
        this.defaultFonts = [
            '\'Noto Serif KR\', serif', 
            'Batang, serif', 
            "'Noto Sans JP', sans-serif", 
            "'Noto Serif JP', serif", 
            "'Malgun Gothic', sans-serif"
        ];

        this.init();
    }

    init() {
        if (!this.loadBtn) return;
        
        // Hide button if API is not supported by the browser
        if (!('queryLocalFonts' in window)) {
            this.loadBtn.style.display = 'none';
            return;
        }

        this.loadBtn.addEventListener('click', () => this.loadLocalFonts());

        // Attach picker UI to all datalist inputs
        document.querySelectorAll('.font-input').forEach(input => {
            input.addEventListener('click', function() {
                if (typeof this.showPicker === 'function') {
                    try { this.showPicker(); } catch(e) {}
                }
            });
        });
    }

    async loadLocalFonts() {
        try {
            this.loadBtn.textContent = '読込中...';
            this.loadBtn.disabled = true;

            const localFonts = await window.queryLocalFonts();
            const fontFamilies = new Set();
            localFonts.forEach(font => fontFamilies.add(font.family));
            
            const sortedFamilies = Array.from(fontFamilies).sort();
            this.presetList.innerHTML = ''; // Clear existing
            
            // 1. Add Default/Recommended Fonts first
            this.defaultFonts.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f;
                this.presetList.appendChild(opt);
            });

            // 2. Add System Fonts
            sortedFamilies.forEach(family => {
                const opt = document.createElement('option');
                opt.value = family.includes(' ') ? `'${family}'` : family;
                this.presetList.appendChild(opt);
            });
            
            alert('PCのフォント一覧を読み込みました！入力欄をクリックすると候補が出ます。');
            this.loadBtn.style.display = 'none';

        } catch (err) {
            console.warn('ローカルフォントへのアクセスが拒否されました:', err);
            alert('フォントの読み込み権限が拒否されたか、エラーが発生しました。');
            this.loadBtn.textContent = 'PCフォント読込';
            this.loadBtn.disabled = false;
        }
    }
}


// ==========================================
// 3. Renderer: Handles Text Parsing & Canvas DOM Updates
// ==========================================
class Renderer {
    constructor() {
        this.canvasArea = document.getElementById('canvas-area');
        this.mainContent = document.getElementById('main-content');
        this.translationContent = document.getElementById('translation-content');
    }

    /** Retrieve all relevant styling values from the DOM */
    getStyles() {
        const getVal = (id) => document.getElementById(id).value;
        const getChecked = (id) => document.getElementById(id).checked;
        return {
            canvas: {
                w: getVal('canvas-width'),
                h: getVal('canvas-height'),
                bg: getVal('bg-color'),
                spacing: getVal('line-spacing')
            },
            main: {
                text: getVal('main-text'),
                font: getVal('main-font'),
                weight: getVal('main-weight'),
                size: getVal('main-size'),
                color: getVal('main-color'),
                strokeCol: getVal('main-stroke-color'),
                strokeW: getVal('main-stroke-width')
            },
            kanji: {
                font: getVal('kanji-font'),
                weight: getVal('kanji-weight'),
                size: getVal('kanji-size'),
                color: getVal('kanji-color')
            },
            kana: {
                text: getVal('kana-text'),
                convertNu: getChecked('convert-small-nu'),
                font: getVal('kana-font'),
                weight: getVal('kana-weight'),
                size: getVal('kana-size'),
                color: getVal('kana-color')
            },
            trans: {
                text: getVal('trans-text'),
                font: getVal('trans-font'),
                weight: getVal('trans-weight'),
                size: getVal('trans-size'),
                color: getVal('trans-color')
            }
        };
    }

    /** Update the entire preview based on current inputs */
    update() {
        const s = this.getStyles();

        // 1. Update Canvas Base styles
        this.canvasArea.style.width = s.canvas.w + 'px';
        this.canvasArea.style.height = s.canvas.h + 'px';
        this.canvasArea.style.backgroundColor = s.canvas.bg;
        this.mainContent.style.gap = s.canvas.spacing + 'px';
        
        // Clear old content
        this.mainContent.innerHTML = '';
        this.translationContent.innerHTML = '';

        // 2. Render Main Text & Rubys
        const mainLines = s.main.text.split('\n');
        const kanaLines = s.kana.text.split('\n');

        mainLines.forEach((mLine, i) => {
            const container = document.createElement('div');
            container.className = 'line-container';

            // Main Text + Kanji Ruby
            const rLine = this.parseAndRenderMainLine(mLine, s.main, s.kanji);
            container.appendChild(rLine);

            // Kana Ruby (Bottom)
            const kaLine = kanaLines[i] || '';
            if (kaLine.trim() || kaLine === ' ') {
                const kanaEl = document.createElement('div');
                kanaEl.className = 'kana-line';
                kanaEl.innerHTML = this.formatKanaText(kaLine, s.kana.convertNu);
                kanaEl.style.fontFamily = s.kana.font;
                kanaEl.style.fontWeight = s.kana.weight;
                kanaEl.style.fontSize = s.kana.size + 'px';
                kanaEl.style.color = s.kana.color;
                container.appendChild(kanaEl);
            }

            this.mainContent.appendChild(container);
        });

        // 3. Render Translation Text (Right-side Vertical Manual Layout)
        const transLines = s.trans.text.split('\n');
        transLines.forEach(lineText => {
            const lineCol = document.createElement('div');
            lineCol.className = 'translation-text-line';
            lineCol.style.fontFamily = s.trans.font;
            lineCol.style.fontWeight = s.trans.weight;
            lineCol.style.fontSize = s.trans.size + 'px';
            lineCol.style.color = s.trans.color;

            if (!lineText) {
                lineCol.style.width = '1em'; // Space for empty lines
            }

            for (let char of lineText) {
                const charEl = document.createElement('span');
                charEl.className = 'vert-char';
                
                if (char === ' ' || char === '　') {
                    charEl.style.height = '0.5em';
                    lineCol.appendChild(charEl);
                    continue;
                }

                charEl.textContent = char;

                if (/[a-zA-Z0-9\-\~ー=〜]/.test(char)) {
                    charEl.classList.add('vert-rotate');
                } else if (char === '。' || char === '、' || char === '.' || char === ',') {
                    charEl.classList.add('vert-punct');
                } else if (['「', '」', '（', '）', '(', ')', '『', '』', '【', '】'].includes(char)) {
                    charEl.classList.add('vert-rotate');
                }

                lineCol.appendChild(charEl);
            }
            this.translationContent.appendChild(lineCol);
        });
        
        // 4. Scale preview to fit screen
        this.scaleToFit();
    }

    /** Handle Ainu small 'nu' (ㇴ) conversion to small 'ン' securely */
    formatKanaText(text, convertNu) {
        const safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (convertNu) {
            return safeText.replace(/ㇴ/g, '<span class="small-n">ン</span>');
        }
        return safeText;
    }

    /** Parses `{main|ruby}` syntax and constructs DOM elements */
    parseAndRenderMainLine(lineStr, mainStyle, kanjiStyle) {
        const lineEl = document.createElement('div');
        lineEl.className = 'rendered-line';

        const regex = /\{([^|{}]+)\|([^|{}]+)\}/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(lineStr)) !== null) {
            // Text before match
            if (match.index > lastIndex) {
                const textBefore = lineStr.substring(lastIndex, match.index);
                lineEl.appendChild(this.createTextChunk(textBefore, '', mainStyle, kanjiStyle));
            }

            const mainTextPart = match[1];
            const topRubyPart = match[2];
            
            // Clean parentheses to count actual ruby characters
            const cleanRuby = topRubyPart.replace(/[()]/g, '');

            if (mainTextPart.length === cleanRuby.length) {
                // 1-to-1 Mapping
                let rubyIndex = 0;
                for (let i = 0; i < mainTextPart.length; i++) {
                    let topChunk = '';
                    
                    // Absorb leading parentheses
                    while (rubyIndex < topRubyPart.length && topRubyPart[rubyIndex] === '(') {
                        topChunk += '('; rubyIndex++;
                    }
                    
                    // Consume one ruby character
                    if (rubyIndex < topRubyPart.length && topRubyPart[rubyIndex] !== '(' && topRubyPart[rubyIndex] !== ')') {
                        topChunk += topRubyPart[rubyIndex]; rubyIndex++;
                    }
                    
                    // Absorb trailing parentheses
                    while (rubyIndex < topRubyPart.length && topRubyPart[rubyIndex] === ')') {
                        topChunk += ')'; rubyIndex++;
                    }
                    
                    lineEl.appendChild(this.createTextChunk(mainTextPart[i], topChunk, mainStyle, kanjiStyle));
                }
            } else {
                // Bulk mapping (Length mismatch)
                lineEl.appendChild(this.createTextChunk(mainTextPart, topRubyPart, mainStyle, kanjiStyle));
            }

            lastIndex = regex.lastIndex;
        }

        // Text after final match
        if (lastIndex < lineStr.length) {
            const textAfter = lineStr.substring(lastIndex);
            lineEl.appendChild(this.createTextChunk(textAfter, '', mainStyle, kanjiStyle));
        }

        return lineEl;
    }

    /** Creates a single block containing top ruby and main text */
    createTextChunk(mainStr, topStr, mainStyle, kanjiStyle) {
        const chunk = document.createElement('div');
        chunk.className = 'text-chunk';

        // Top Ruby Element
        if (topStr.trim() || topStr === ' ' || topStr === '(' || topStr === ')') {
            const topEl = document.createElement('div');
            topEl.className = 'ruby-top';
            topEl.textContent = topStr;
            topEl.style.fontFamily = kanjiStyle.font;
            topEl.style.fontWeight = kanjiStyle.weight;
            topEl.style.fontSize = kanjiStyle.size + 'px';
            topEl.style.color = kanjiStyle.color;
            chunk.appendChild(topEl);
        }

        // Main Text Element
        if (mainStr) {
            const mainEl = document.createElement('div');
            mainEl.className = 'main-text-part';
            mainEl.textContent = mainStr;
            
            // Set styles and text stroke hack via data attribute
            mainEl.setAttribute('data-text', mainStr);
            mainEl.style.setProperty('--stroke-color', mainStyle.strokeCol);
            mainEl.style.setProperty('--stroke-width', mainStyle.strokeW + 'px');
            mainEl.style.fontFamily = mainStyle.font;
            mainEl.style.fontWeight = mainStyle.weight;
            mainEl.style.fontSize = mainStyle.size + 'px';
            mainEl.style.color = mainStyle.color;

            chunk.appendChild(mainEl);
        }

        return chunk;
    }

    /** Scales the preview visually (CSS Transform) so it fits in the app layout */
    scaleToFit() {
        const panel = document.querySelector('.preview-panel');
        const wrapper = document.querySelector('.preview-wrapper');
        const s = this.getStyles();
        
        const padding = 80;
        const availableWidth = panel.clientWidth - padding;
        const availableHeight = panel.clientHeight - padding;

        const scaleX = availableWidth / s.canvas.w;
        const scaleY = availableHeight / s.canvas.h;
        const scale = Math.min(scaleX, scaleY, 1);

        wrapper.style.transform = `scale(${scale})`;
    }
}


// ==========================================
// 4. ExportManager: Handles PNG Generation
// ==========================================
class ExportManager {
    constructor(btnId) {
        this.exportBtn = document.getElementById(btnId);
        if (this.exportBtn) {
            this.exportBtn.addEventListener('click', () => this.exportPNG());
        }
    }

    async exportPNG() {
        this.exportBtn.textContent = '保存中...';
        this.exportBtn.disabled = true;

        const wrapper = document.querySelector('.preview-wrapper');
        const canvasArea = document.getElementById('canvas-area');
        const bgColor = document.getElementById('bg-color').value;

        try {
            // Temporarily disable scaling to ensure full 1:1 resolution export
            const originalTransform = wrapper.style.transform;
            wrapper.style.transform = 'scale(1)';

            const canvas = await html2canvas(canvasArea, {
                scale: 2, // High resolution output
                backgroundColor: bgColor,
                logging: false,
                useCORS: true
            });

            // Trigger download
            const link = document.createElement('a');
            link.download = `typeset_${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            // Restore scale
            wrapper.style.transform = originalTransform;

        } catch (error) {
            console.error('Export failed:', error);
            alert('保存に失敗しました。');
        } finally {
            this.exportBtn.textContent = 'PNG出力';
            this.exportBtn.disabled = false;
        }
    }
}


// ==========================================
// 5. App: Main Controller
// ==========================================
class App {
    constructor() {
        // Collect inputs for state tracking
        this.allInputs = document.querySelectorAll('input[type="text"], input[type="number"], input[type="color"], input[type="checkbox"], textarea');
        
        // Initialize Modules
        this.settings = new SettingsManager(this.allInputs);
        this.fonts = new FontManager('load-local-fonts-btn', 'font-presets');
        this.renderer = new Renderer();
        this.exporter = new ExportManager('export-png-btn');

        this.init();
    }

    init() {
        // Bind UI Events
        this.bindEvents();

        // Load persisted state and perform initial render
        this.settings.load();
        this.renderer.update();
    }

    bindEvents() {
        // Update rendering and save on any input change
        this.allInputs.forEach(el => {
            el.addEventListener('input', () => {
                this.renderer.update();
                this.settings.save();
            });
        });

        // Window resize updates the preview scaling
        window.addEventListener('resize', () => {
            this.renderer.scaleToFit();
        });

        // Preset Export/Import
        document.getElementById('export-preset-btn').addEventListener('click', () => {
            this.settings.exportJSON();
        });

        const importInput = document.getElementById('import-preset-input');
        importInput.addEventListener('change', (e) => {
            this.settings.importJSON(e.target.files[0], () => {
                this.renderer.update();
                this.settings.save();
                importInput.value = ''; // Reset file input
            });
        });
    }
}

// Bootstrap Application
document.addEventListener('DOMContentLoaded', () => new App());
