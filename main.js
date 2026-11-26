(() => {
  const translations = {
    pl: {
      phaseNotes: {
        dawn: 'Zmienne pola stopniowo się rozjaśniają.',
        day: 'Zmienne pola osiągają najwyższą jasność.',
        dusk: 'Zmienne pola ciemnieją wraz z upływem tur.',
        night: 'Zmienne pola osiągają najniższą jasność.',
      },
      lightBoard: phase => `Plansza 9 na 9. ${phase}. 31 pól zmiennych i pięć punktów mocy.`,
      rosterPosition: (name, position, count) => `${name}, ${position} z ${count}`,
      trialCaption: targets => `Cel na planszy · ${targets.join(' · ')}`,
      trialBoard: targets => `Pola celu próby ${targets.join(', ')}`,
    },
    en: {
      phaseNotes: {
        dawn: 'Shifting squares grow brighter.',
        day: 'Shifting squares are at their brightest.',
        dusk: 'Shifting squares darken with each turn.',
        night: 'Shifting squares are at their darkest.',
      },
      lightBoard: phase => `9-by-9 board. ${phase}. 31 shifting squares and five power points.`,
      rosterPosition: (name, position, count) => `${name}, ${position} of ${count}`,
      trialCaption: targets => `Board objective · ${targets.join(' · ')}`,
      trialBoard: targets => `Trial objective ${targets.join(', ')}`,
    },
  };
  const copy = translations[document.documentElement.lang] ?? translations.pl;

  const languageLinks = document.querySelectorAll('.language-nav a');

  function updateLanguageLinks() {
    for (const link of languageLinks) link.hash = location.hash;
  }

  updateLanguageLinks();
  window.addEventListener('hashchange', updateLanguageLinks);

  // D, L i S odpowiadają układowi z Assets/Archon/Data/board.json.
  const boardRows = [
    'DLDSSSLDL',
    'LDSLSDSLD',
    'DSLDSLDSL',
    'SLDLSDLDS',
    'LSSSSSSSD',
    'SLDLSDLDS',
    'DSLDSLDSL',
    'LDSLSDSLD',
    'DLDSSSLDL',
  ];
  const files = 'ABCDEFGHI';
  const powerPoints = new Set(['E1', 'A5', 'E5', 'I5', 'E9']);

  function fillAxis(axis, labels) {
    axis.replaceChildren(...labels.map(label => {
      const marker = document.createElement('span');
      marker.textContent = label;
      return marker;
    }));
  }

  function drawBoard(board) {
    const cells = new Map();
    const grid = board.querySelector('[data-cells]');
    fillAxis(board.querySelector('[data-axis="files"]'), Array.from(files));
    fillAxis(board.querySelector('[data-axis="ranks"]'), boardRows.map((_, rank) => rank + 1));

    const tiles = boardRows.flatMap((row, rank) => Array.from(row, (code, file) => {
      const coordinate = files[file] + (rank + 1);
      const tile = document.createElement('span');
      tile.className = 'tactical-cell';
      tile.dataset.code = code;
      if (powerPoints.has(coordinate)) tile.dataset.power = coordinate;
      cells.set(coordinate, tile);
      return tile;
    }));

    grid.replaceChildren(...tiles);
    return cells;
  }

  for (const widget of document.querySelectorAll('[data-switch]')) {
    const tabs = [...widget.querySelectorAll('[role="tab"]')];
    const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
    const rosterTrack = widget.querySelector('.roster-tabs');
    const rosterStatus = widget.querySelector('.roster-status');
    let boardTab = tabs[0];

    function selectTab(activeTab, scrollBehavior = 'auto') {
      if (activeTab.dataset.choice === '3d' || activeTab.dataset.choice === '2d') {
        boardTab = activeTab;
      }
      tabs.forEach((tab, index) => {
        const selected = tab === activeTab;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        panels[index].hidden = !selected;
        panels[index].classList.toggle('is-revealed', selected);
      });
      if (widget.dataset.switch === 'trial') {
        showTrialTarget(panels[tabs.indexOf(activeTab)]);
      }
      if (rosterTrack) {
        const trackBounds = rosterTrack.getBoundingClientRect();
        const tabBounds = activeTab.getBoundingClientRect();
        const inset = Number.parseFloat(getComputedStyle(rosterTrack).paddingInlineStart);
        const leftOverflow = Math.min(0, tabBounds.left - trackBounds.left - inset);
        const rightOverflow = Math.max(0, tabBounds.right - trackBounds.right + inset);
        const distance = leftOverflow + rightOverflow;
        // Gdy miniatura już jest widoczna, zatrzymaj wcześniejszą animację paska.
        rosterTrack.scrollBy({ left: distance, behavior: distance ? scrollBehavior : 'instant' });
      }
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => selectTab(tab));
      tab.addEventListener('keydown', event => {
        const arrowStep = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
        let nextIndex;
        if (arrowStep) nextIndex = (index + arrowStep + tabs.length) % tabs.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabs.length - 1;
        else return;

        event.preventDefault();
        selectTab(tabs[nextIndex], 'instant');
        tabs[nextIndex].focus({ preventScroll: Boolean(rosterTrack) });
      });
    });

    for (const button of widget.querySelectorAll('[data-roster-step]')) {
      button.addEventListener('click', () => {
        const currentIndex = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
        const step = Number(button.dataset.rosterStep);
        const nextIndex = (currentIndex + step + tabs.length) % tabs.length;
        const nextTab = tabs[nextIndex];
        selectTab(nextTab, nextIndex === currentIndex + step ? 'auto' : 'instant');
        rosterStatus.textContent = copy.rosterPosition(nextTab.textContent.trim(), nextIndex + 1, tabs.length);
      });
    }

    for (const button of widget.querySelectorAll('[data-jump]')) {
      button.addEventListener('click', () => {
        const tab = button.dataset.jump === 'board'
          ? boardTab
          : tabs.find(option => option.dataset.choice === button.dataset.jump);
        selectTab(tab);
        tab.focus({ preventScroll: true });
        widget.scrollIntoView({ block: 'start' });
      });
    }
  }

  const cycle = document.getElementById('blades-cycle');
  const lightBoard = document.getElementById('blades-light-board');
  const phaseStatus = cycle.querySelector('.phase-status');
  const phaseButtons = [...cycle.querySelectorAll('[data-phase-choice]')];

  drawBoard(lightBoard);
  for (const button of phaseButtons) {
    button.addEventListener('click', () => {
      const phase = button.dataset.phaseChoice;
      const name = button.textContent.trim();
      phaseButtons.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
      cycle.dataset.phase = phase;
      phaseStatus.textContent = name + ' · ' + copy.phaseNotes[phase];
      lightBoard.setAttribute('aria-label', copy.lightBoard(name));
    });
  }

  const trials = document.getElementById('blades-trials');
  const trialBoard = trials.querySelector('[data-board]');
  const trialCells = drawBoard(trialBoard);
  const trialCaption = trials.querySelector('.trial-map__caption');

  function showTrialTarget(activeTrial) {
    const targets = activeTrial.dataset.targets.split(' ');
    for (const [coordinate, tile] of trialCells) {
      tile.toggleAttribute('data-target', targets.includes(coordinate));
    }

    trialCaption.textContent = copy.trialCaption(targets);
    trialBoard.setAttribute('aria-label', copy.trialBoard(targets));
  }

  showTrialTarget(trials.querySelector('.trial-scene:not([hidden])'));

  const captureDialog = document.querySelector('.capture-dialog');
  const enlargedCapture = captureDialog.querySelector('img');
  document.querySelector('[data-zoom]').addEventListener('click', () => {
    const capture = document.querySelector('.game-scene:not([hidden]) img');
    enlargedCapture.src = capture.currentSrc || capture.src;
    enlargedCapture.alt = capture.alt;
    captureDialog.showModal();
  });
})();
