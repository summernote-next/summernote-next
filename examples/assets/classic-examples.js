import './examples.js';

const modalInstances = new WeakMap();

function dispatchModalEvent(element, type) {
  element.dispatchEvent(new CustomEvent(type, {
    bubbles: true,
  }));
}

export class ExampleModal {
  constructor(element) {
    this.element = element;
    this.dialog = element.querySelector('.modal-dialog');
    this.backdrop = null;

    this.handleBackdropClick = this.handleBackdropClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);

    modalInstances.set(element, this);
  }

  static getInstance(element) {
    return modalInstances.get(element) || null;
  }

  static getOrCreateInstance(element) {
    return ExampleModal.getInstance(element) || new ExampleModal(element);
  }

  show() {
    if (this.element.classList.contains('show')) {
      return;
    }

    dispatchModalEvent(this.element, 'show.example.modal');

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'example-modal-backdrop';
    this.backdrop.addEventListener('click', this.handleBackdropClick);
    document.body.append(this.backdrop);

    this.element.hidden = false;
    this.element.setAttribute('aria-hidden', 'false');
    this.element.classList.add('show');
    document.body.classList.add('example-modal-open');
    document.addEventListener('keydown', this.handleKeydown);

    window.requestAnimationFrame(() => {
      this.dialog?.setAttribute('tabindex', '-1');
      this.dialog?.focus();
      dispatchModalEvent(this.element, 'shown.example.modal');
    });
  }

  hide() {
    if (!this.element.classList.contains('show')) {
      return;
    }

    dispatchModalEvent(this.element, 'hide.example.modal');

    this.element.classList.remove('show');
    this.element.setAttribute('aria-hidden', 'true');
    this.element.hidden = true;
    document.body.classList.remove('example-modal-open');
    document.removeEventListener('keydown', this.handleKeydown);

    this.backdrop?.removeEventListener('click', this.handleBackdropClick);
    this.backdrop?.remove();
    this.backdrop = null;

    dispatchModalEvent(this.element, 'hidden.example.modal');
  }

  toggle() {
    if (this.element.classList.contains('show')) {
      this.hide();
      return;
    }

    this.show();
  }

  handleBackdropClick(event) {
    if (event.target === this.backdrop) {
      this.hide();
    }
  }

  handleKeydown(event) {
    if (event.key === 'Escape') {
      this.hide();
    }
  }
}

function resolveModalTarget(trigger) {
  const selector = trigger.getAttribute('data-example-modal-target');
  if (!selector) {
    return null;
  }

  return document.querySelector(selector);
}

document.addEventListener('click', (event) => {
  const dismissTrigger = event.target.closest('[data-example-modal-dismiss="modal"]');
  if (dismissTrigger) {
    const modal = dismissTrigger.closest('.modal');
    if (modal) {
      ExampleModal.getOrCreateInstance(modal).hide();
    }
    return;
  }

  const openTrigger = event.target.closest('[data-example-modal-toggle="modal"]');
  if (!openTrigger) {
    return;
  }

  const target = resolveModalTarget(openTrigger);
  if (!target) {
    return;
  }

  ExampleModal.getOrCreateInstance(target).show();
});

window.ExampleModal = ExampleModal;
