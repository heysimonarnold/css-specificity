import "./style.scss";

import levels from "./src/data/levels.json";
import Level from "./src/scripts/level.js";

import ogEn from "./src/img/og-en.png";
import ogFr from "./src/img/og-fr.png";

const SUPPORTED_LANGUAGES = ["en", "fr"];
const STORAGE_KEYS = {
  lang: "lang",
  level: "level",
  score: "score",
};

const POPUP_CLASSES = [
  "popup--success",
  "popup--fail",
  "popup--end",
  "popup--no-more-question",
];

class Game {
  constructor() {
    this.levelsArr = [...levels.content];
    this.level = 0;
    this.score = 0;
    this.data = null;
    this.loadRequest = null;

    this.lang = this.getBrowserLanguage();
    this.dom = this.getDOM();
    this.meta = this.getMetaElements();

    this.init();
  }

  getBrowserLanguage() {
    const language = navigator.language.slice(0, 2).toLowerCase();

    return SUPPORTED_LANGUAGES.includes(language) ? language : "en";
  }

  getDOM() {
    const query = (selector) => document.querySelector(selector);

    return {
      app: query("#app"),
      main: query(".main"),
      lang: query(".lang"),

      level: {
        label: query(".level__label"),
        current: query(".level__current"),
        of: query(".level__of"),
        total: query(".level__total"),
      },

      header: {
        el: query(".header"),
        title: query(".header__title"),
        intro: query(".header__intro"),
      },

      footer: {
        el: query(".footer"),
        reset: query(".reset"),
        credits: query(".footer__credits"),
      },

      score: {
        label: query(".score__label"),
        value: query(".score__value"),
        total: query(".score__total"),
      },

      popup: {
        el: query(".popup"),
        main: query(".popup__main"),
        congratulation: query(".congratulation"),
        quizCompleted: query(".popup__quiz-completed"),
        next: query(".popup__next"),
        showResult: query(".popup__show-result"),
        randomQuestions: query(".popup__random-questions"),
      },
    };
  }

  getMetaElements() {
    const query = (selector) => document.querySelector(selector);

    return {
      title: query('meta[property="og:title"]'),
      description: query('meta[property="og:description"]'),
      image: query('meta[property="og:image"]'),
    };
  }

  init() {
    this.loadGame();
    this.bindEvents();
    this.loadData();
  }

  loadGame() {
    const savedLang = localStorage.getItem(STORAGE_KEYS.lang);
    const savedLevel = Number(localStorage.getItem(STORAGE_KEYS.level));
    const savedScore = Number(localStorage.getItem(STORAGE_KEYS.score));

    if (SUPPORTED_LANGUAGES.includes(savedLang)) {
      this.lang = savedLang;
    }

    this.level =
      Number.isInteger(savedLevel) && savedLevel >= 0 ? savedLevel : 0;

    this.score =
      Number.isFinite(savedScore) && savedScore >= 0 ? savedScore : 0;

    // Restart if the saved game has already reached the end.
    if (this.level >= this.levelsArr.length) {
      this.level = 0;
      this.score = 0;
    }

    this.dom.lang.value = this.lang;
    this.showLevel();
  }

  async loadData() {
    // Cancel an earlier request if the language changes again.
    this.loadRequest?.abort();

    const controller = new AbortController();
    this.loadRequest = controller;

    try {
      const response = await fetch(`./src/data/${this.lang}.json`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Unable to load language data: ${response.status}`);
      }

      const data = await response.json();

      // Ignore a response that is no longer the active request.
      if (this.loadRequest !== controller) return;

      this.data = data;
      this.i18n();
      this.goToLevel(this.level);

      this.dom.app.classList.add("is-ready");
    } catch (error) {
      if (error.name === "AbortError") return;

      console.error("Unable to load the game:", error);
      this.dom.app.classList.remove("is-ready");
    }
  }

  changeLang() {
    const language = this.dom.lang.value;

    if (!SUPPORTED_LANGUAGES.includes(language)) return;

    this.lang = language;
    localStorage.setItem(STORAGE_KEYS.lang, language);

    this.dom.app.classList.remove("is-ready");
    this.loadData();
  }

  i18n() {
    const { data, lang, dom, meta } = this;

    document.documentElement.lang = lang;
    document.title = data.title;

    if (meta.title) meta.title.content = data.title;
    if (meta.description) meta.description.content = data.slogan;

    if (meta.image) {
      meta.image.content = lang === "fr" ? ogFr : ogEn;
    }

    dom.level.label.textContent = data.level;
    dom.level.of.textContent = data.of;

    dom.header.title.textContent = data.title;
    dom.header.intro.innerHTML = data.intro;

    dom.score.label.textContent = data.score;

    dom.footer.reset.innerHTML = data.reset;
    dom.footer.credits.innerHTML = data.credits;

    dom.popup.congratulation.textContent = data.congratulation;
    dom.popup.quizCompleted.textContent = data["quiz-completed"];
    dom.popup.next.textContent = data["next-question"];
    dom.popup.showResult.textContent = data["show-result"];
    dom.popup.randomQuestions.textContent = data["questions-in-random-order"];
  }

  bindEvents() {
    const { dom } = this;

    document.body.addEventListener("success", () => this.successPopup());

    document.body.addEventListener("fail", () => this.failPopup());

    dom.footer.reset.addEventListener("click", () => this.reset());

    dom.lang.addEventListener("change", () => this.changeLang());

    dom.popup.next.addEventListener("click", () => this.nextLevel());

    dom.popup.showResult.addEventListener("click", () => this.setPopupEnd());

    dom.popup.randomQuestions.addEventListener("click", () =>
      this.randomizeQuestions(),
    );

    window.addEventListener("popstate", () => {
      const slug = new URLSearchParams(location.search).get("level");
      const index = this.levelsArr.findIndex((level) => level.slug === slug);

      if (index !== -1) this.goToLevel(index, false);
    });
  }

  goToLevel(level, updateHistory = true) {
    if (!Number.isInteger(level)) return;
    if (level < 0 || level >= this.levelsArr.length) return;
    if (!this.data) return;

    this.level = level;
    localStorage.setItem(STORAGE_KEYS.level, String(level));

    this.showScore();
    this.clearPopup();

    if (updateHistory) {
      history.pushState({}, "", `?level=${this.getLevelSlug(level)}`);
    }

    const levelData = this.levelsArr[level];
    const questions = this.data.questions[levelData.slug];

    new Level(levelData, questions, this.dom.main, this.data);
  }

  nextLevel() {
    if (this.level < this.levelsArr.length - 1) {
      this.goToLevel(this.level + 1);
    }
  }

  getLevelSlug(level) {
    return this.levelsArr[level]?.slug;
  }

  showLevel() {
    this.dom.level.current.textContent = this.level + 1;
    this.dom.level.total.textContent = this.levelsArr.length;
  }

  showScore() {
    localStorage.setItem(STORAGE_KEYS.score, String(this.score));

    this.dom.score.value.textContent = this.score;
    this.dom.score.total.textContent = this.level;
    this.showLevel();
  }

  reset() {
    // Preserve the selected language and unrelated site storage.
    localStorage.removeItem(STORAGE_KEYS.level);
    localStorage.removeItem(STORAGE_KEYS.score);

    this.level = 0;
    this.score = 0;

    if (this.data) {
      this.goToLevel(0);
    } else {
      this.showLevel();
    }
  }

  successPopup() {
    this.score++;
    this.showScore();
    this.updatePopupState("success");
  }

  failPopup() {
    this.updatePopupState("fail");
  }

  updatePopupState(result) {
    const isLastLevel = this.level === this.levelsArr.length - 1;
    const { popup } = this.dom;

    popup.el.classList.toggle("popup--no-more-question", isLastLevel);

    popup.el.classList.remove(
      result === "success" ? "popup--fail" : "popup--success",
    );

    popup.el.classList.add(`popup--${result}`);
  }

  clearPopup() {
    this.dom.popup.el.classList.remove(...POPUP_CLASSES);
  }

  setPopupEnd() {
    this.showScore();
    this.clearPopup();

    const { popup } = this.dom;

    popup.main.innerHTML = `
      ${this.data["final-score"]}:
      <div class="final-score">
        ${this.score} / ${this.levelsArr.length}
      </div>
    `;

    popup.el.classList.add("popup--end");
  }

  randomizeQuestions() {
    this.levelsArr = this.shuffleArray(this.levelsArr);
    this.reset();
  }

  shuffleArray(array) {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }
}

new Game();
