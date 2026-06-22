/*! 
Summernote Next
Super simple WYSIWYG editor
Version 1.0.1
https://juergen-schwind.com/summernote-next

Copyright 2013-present Hackerwins and contributors
Copyright 2026-present Jürgen Schwind and contributors
Summernote Next may be freely distributed under the MIT license.

Date: 2026-06-22T16:35Z
 */
var summernote = (function() {
	//#region src/js/core/dom-query.js
	/**
	* Chainable DOM manipulation utilities used across the Vanilla JS runtime.
	*
	* @module dom-query
	*/
	/**
	* Wrap a DOM element, NodeList, or selector in a DomQuery collection.
	* Usage: $$('selector'), $$(element), $$$(nodeList)
	*/
	var elementDataStore = /* @__PURE__ */ new WeakMap();
	var defaultDisplayCache = /* @__PURE__ */ new Map();
	var fallbackModalStore = /* @__PURE__ */ new WeakMap();
	function isHtmlString(value) {
		return typeof value === "string" && value.trim().startsWith("<") && value.trim().endsWith(">");
	}
	function parseHTMLString(html) {
		const template = document.createElement("template");
		template.innerHTML = html.trim();
		return Array.from(template.content.childNodes);
	}
	function getElementDataStore(element) {
		let store = elementDataStore.get(element);
		if (!store) {
			store = {};
			elementDataStore.set(element, store);
		}
		return store;
	}
	function getDefaultDisplay(tagName) {
		const normalizedTagName = tagName.toLowerCase();
		if (defaultDisplayCache.has(normalizedTagName)) return defaultDisplayCache.get(normalizedTagName);
		const element = document.createElement(normalizedTagName);
		document.body.appendChild(element);
		let display = getComputedStyle(element).display;
		element.remove();
		if (display === "none") display = "block";
		defaultDisplayCache.set(normalizedTagName, display);
		return display;
	}
	function normalizeEvent(event, delegateTarget) {
		if (!event.originalEvent) event.originalEvent = event;
		if (!event.isDefaultPrevented) event.isDefaultPrevented = () => event.defaultPrevented;
		if (delegateTarget && !event.delegateTarget) event.delegateTarget = delegateTarget;
		return event;
	}
	function getEventNames(events) {
		if (!events) return [];
		return events.split(/\s+/).filter(Boolean);
	}
	function normalizeEventDetail(detail) {
		return detail === void 0 ? [] : [].concat(detail);
	}
	function getBootstrap() {
		return globalThis.window?.bootstrap;
	}
	function sanitizeBootstrapOptions(options) {
		if (!options || typeof options !== "object") return;
		const sanitized = {};
		let hasEntries = false;
		Object.entries(options).forEach(([key, value]) => {
			const normalizedValue = value instanceof DomQuery ? value.get(0) : value;
			if (normalizedValue === null || normalizedValue === void 0) return;
			sanitized[key] = normalizedValue;
			hasEntries = true;
		});
		return hasEntries ? sanitized : void 0;
	}
	function getFallbackModalState(element) {
		let state = fallbackModalStore.get(element);
		if (!state) {
			state = {
				backdrop: null,
				visible: false,
				closeHandler: null,
				backdropHandler: null,
				keydownHandler: null,
				activeElement: null
			};
			fallbackModalStore.set(element, state);
		}
		return state;
	}
	function isFallbackModalVisible(state) {
		return Boolean(state && state.visible);
	}
	function hasVisibleFallbackModal() {
		return Array.from(document.querySelectorAll(".note-modal")).some((modal) => {
			return isFallbackModalVisible(fallbackModalStore.get(modal));
		});
	}
	function syncFallbackModalBodyState() {
		if (hasVisibleFallbackModal()) document.body.classList.add("note-modal-open");
		else document.body.classList.remove("note-modal-open");
	}
	function showFallbackModal(element) {
		const state = getFallbackModalState(element);
		if (state.visible) return;
		state.visible = true;
		state.activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const backdrop = document.createElement("div");
		backdrop.className = "note-modal-backdrop";
		document.body.appendChild(backdrop);
		state.backdrop = backdrop;
		state.closeHandler = (event) => {
			const dismissTarget = event.target instanceof Element ? event.target.closest("[data-bs-dismiss=\"modal\"]") : null;
			if (dismissTarget && element.contains(dismissTarget)) {
				event.preventDefault();
				hideFallbackModal(element);
			}
		};
		state.backdropHandler = () => {
			hideFallbackModal(element);
		};
		state.keydownHandler = (event) => {
			if (event.key === "Escape") hideFallbackModal(element);
		};
		element.addEventListener("click", state.closeHandler);
		backdrop.addEventListener("click", state.backdropHandler);
		document.addEventListener("keydown", state.keydownHandler);
		element.style.display = "block";
		element.classList.add("show");
		element.removeAttribute("aria-hidden");
		element.setAttribute("aria-modal", "true");
		backdrop.classList.add("show");
		syncFallbackModalBodyState();
		$$(element).trigger("shown.bs.modal");
	}
	function hideFallbackModal(element) {
		const state = fallbackModalStore.get(element);
		if (!state || !state.visible) return;
		state.visible = false;
		element.classList.remove("show");
		element.style.display = "none";
		element.setAttribute("aria-hidden", "true");
		element.removeAttribute("aria-modal");
		if (state.closeHandler) element.removeEventListener("click", state.closeHandler);
		if (state.backdrop && state.backdropHandler) state.backdrop.removeEventListener("click", state.backdropHandler);
		if (state.keydownHandler) document.removeEventListener("keydown", state.keydownHandler);
		if (state.backdrop) state.backdrop.remove();
		state.backdrop = null;
		state.closeHandler = null;
		state.backdropHandler = null;
		state.keydownHandler = null;
		if (state.activeElement && typeof state.activeElement.focus === "function") state.activeElement.focus();
		state.activeElement = null;
		syncFallbackModalBodyState();
		$$(element).trigger("hidden.bs.modal");
	}
	function normalizeClassNames(classes) {
		return classes.flatMap((className) => typeof className === "string" ? className.split(/\s+/) : className).filter(Boolean);
	}
	function isPlainObject(value) {
		if (!value || Object.prototype.toString.call(value) !== "[object Object]") return false;
		const prototype = Object.getPrototypeOf(value);
		return prototype === Object.prototype || prototype === null;
	}
	var unitlessStyleProperties = new Set([
		"animationIterationCount",
		"columnCount",
		"fillOpacity",
		"flexGrow",
		"flexShrink",
		"fontWeight",
		"lineHeight",
		"opacity",
		"order",
		"orphans",
		"widows",
		"zIndex",
		"zoom"
	]);
	function formatStyleValue(property, value) {
		if (typeof value !== "number" || value === 0 || unitlessStyleProperties.has(property)) return value;
		return `${value}px`;
	}
	function isWindowObject(value) {
		return value instanceof Window;
	}
	function isDocumentObject(value) {
		return value === document;
	}
	function getScrollContainer(target) {
		if (isDocumentObject(target) || isWindowObject(target)) return target.document?.scrollingElement || document.scrollingElement || document.documentElement;
		return target;
	}
	function normalizeQueryRoots(context) {
		if (context instanceof DomQuery) return context.elements;
		if (context instanceof Element || context instanceof DocumentFragment || context === document) return [context];
		if (context instanceof NodeList || Array.isArray(context)) return Array.from(context);
		return [document];
	}
	function isSimpleIdSelector(selector) {
		return /^#[^\s>+~.[\]:,]+$/.test(selector);
	}
	function queryBySimpleId(root, selector) {
		const id = selector.slice(1);
		const candidate = (root === document ? document : root.ownerDocument || document).getElementById(id);
		if (candidate && root === document) return [candidate];
		if (candidate && root.contains(candidate)) return [candidate];
		if (root === document) return [];
		return Array.from(root.querySelectorAll("*")).filter((element) => element.id === id);
	}
	function querySelectorAllCompat(root, selector) {
		if (isSimpleIdSelector(selector)) return queryBySimpleId(root, selector);
		return Array.from(root.querySelectorAll(selector));
	}
	var DomQuery = class DomQuery {
		constructor(selector, context) {
			if (typeof selector === "string" && isHtmlString(selector)) this.elements = parseHTMLString(selector);
			else if (typeof selector === "string") this.elements = normalizeQueryRoots(context).flatMap((root) => querySelectorAllCompat(root, selector));
			else if (selector instanceof Element || selector instanceof DocumentFragment || selector instanceof Window || selector === document) this.elements = [selector];
			else if (selector instanceof NodeList || Array.isArray(selector)) this.elements = Array.from(selector);
			else if (selector instanceof DomQuery) this.elements = [...selector.elements];
			else this.elements = [];
			this.refreshCollection();
		}
		refreshCollection() {
			const previousLength = this.length || 0;
			for (let index = 0; index < previousLength; index++) delete this[index];
			this.length = this.elements.length;
			this.elements.forEach((element, index) => {
				this[index] = element;
			});
			return this;
		}
		/** Get raw element at index. Negative indices supported. */
		get(index = 0) {
			if (index < 0) index = this.length + index;
			return this.elements[index] || null;
		}
		first() {
			return this.eq(0);
		}
		last() {
			return this.eq(-1);
		}
		each(callback) {
			this.elements.forEach((el, i) => callback.call(el, i, el));
			return this;
		}
		map(callback) {
			return this.elements.map((el, i) => callback.call(el, i, el));
		}
		filter(callback) {
			return new DomQuery(typeof callback === "function" ? this.elements.filter((el, i) => callback.call(el, i, el)) : this.elements.filter((el) => el.matches(callback)));
		}
		addClass(...classes) {
			const classNames = normalizeClassNames(classes);
			this.elements.forEach((el) => el.classList.add(...classNames));
			return this;
		}
		removeClass(...classes) {
			const classNames = normalizeClassNames(classes);
			this.elements.forEach((el) => {
				if (!classNames.length) {
					el.className = "";
					return;
				}
				el.classList.remove(...classNames);
			});
			return this;
		}
		hasClass(className) {
			return this.elements.some((el) => el?.classList?.contains(className));
		}
		toggleClass(className, force) {
			this.elements.forEach((el) => {
				if (force === void 0) el.classList.toggle(className);
				else el.classList.toggle(className, force);
			});
			return this;
		}
		css(prop, val) {
			if (typeof prop === "string") {
				if (val === void 0) {
					const el = this.get(0);
					if (!el) return;
					const computedStyle = getComputedStyle(el);
					return computedStyle.getPropertyValue(prop) || computedStyle[prop];
				}
				this.elements.forEach((el) => el.style[prop] = formatStyleValue(prop, val));
				return this;
			}
			if (typeof prop === "object") {
				this.elements.forEach((el) => {
					Object.entries(prop).forEach(([key, value]) => {
						el.style[key] = formatStyleValue(key, value);
					});
				});
				return this;
			}
			return this;
		}
		attr(name, value) {
			if (typeof name === "object" && name !== null) {
				this.elements.forEach((el) => {
					Object.entries(name).forEach(([key, val]) => {
						if (val === false || val === null || val === void 0) {
							el.removeAttribute(key);
							return;
						}
						el.setAttribute(key, val);
					});
				});
				return this;
			}
			if (value === void 0) {
				const el = this.get(0);
				return el ? el.getAttribute(name) : void 0;
			}
			this.elements.forEach((el) => {
				if (value === false || value === null || value === void 0) {
					el.removeAttribute(name);
					return;
				}
				el.setAttribute(name, value);
			});
			return this;
		}
		removeAttr(name) {
			this.elements.forEach((el) => el.removeAttribute(name));
			return this;
		}
		prop(name, value) {
			if (typeof name === "object" && name !== null) {
				this.elements.forEach((el) => {
					Object.entries(name).forEach(([key, val]) => {
						el[key] = val;
					});
				});
				return this;
			}
			if (value === void 0) {
				const el = this.get(0);
				return el ? el[name] : void 0;
			}
			this.elements.forEach((el) => {
				el[name] = value;
			});
			return this;
		}
		data(key, value) {
			if (typeof key === "object" && key !== null) {
				this.elements.forEach((el) => {
					Object.assign(getElementDataStore(el), key);
				});
				return this;
			}
			if (value === void 0) {
				const el = this.get(0);
				if (!el) return void 0;
				const store = getElementDataStore(el);
				if (key === void 0) return {
					...el.dataset,
					...store
				};
				if (Object.prototype.hasOwnProperty.call(store, key)) return store[key];
				return el.dataset[key];
			}
			this.elements.forEach((el) => {
				getElementDataStore(el)[key] = value;
			});
			return this;
		}
		removeData(key) {
			this.elements.forEach((el) => {
				if (key === void 0) {
					elementDataStore.delete(el);
					return;
				}
				delete getElementDataStore(el)[key];
				delete el.dataset[key];
			});
			return this;
		}
		html(content) {
			if (content === void 0) {
				const el = this.get(0);
				return el ? el.innerHTML : "";
			}
			const appendHtmlContent = (parent, value) => {
				if (value instanceof DomQuery) {
					value.elements.forEach((child) => {
						parent.appendChild(child);
					});
					return;
				}
				if (Array.isArray(value)) {
					value.forEach((item) => appendHtmlContent(parent, item));
					return;
				}
				if (value instanceof Node) {
					parent.appendChild(value);
					return;
				}
				parent.insertAdjacentHTML("beforeend", String(value));
			};
			this.elements.forEach((el) => {
				el.innerHTML = "";
				appendHtmlContent(el, content);
			});
			return this;
		}
		text(content) {
			if (content === void 0) {
				const el = this.get(0);
				return el ? el.textContent : "";
			}
			this.elements.forEach((el) => {
				el.textContent = content;
			});
			return this;
		}
		val(value) {
			if (value === void 0) {
				const el = this.get(0);
				return el ? el.value : void 0;
			}
			this.elements.forEach((el) => {
				el.value = value;
			});
			return this;
		}
		find(selector) {
			const results = [];
			this.elements.forEach((el) => {
				results.push(...querySelectorAllCompat(el, selector));
			});
			return new DomQuery(results);
		}
		closest(selector) {
			const results = [];
			this.elements.forEach((el) => {
				const closest = el.closest(selector);
				if (closest) results.push(closest);
			});
			return new DomQuery(results);
		}
		parent(selector) {
			const results = [];
			this.elements.forEach((el) => {
				const p = el.parentElement;
				if (p && (!selector || p.matches(selector))) results.push(p);
			});
			return new DomQuery(results);
		}
		parents(selector) {
			const results = [];
			this.elements.forEach((el) => {
				let p = el.parentElement;
				while (p) {
					if (!selector || p.matches(selector)) results.push(p);
					p = p.parentElement;
				}
			});
			return new DomQuery([...new Set(results)]);
		}
		parentsUntil(selector) {
			const results = [];
			this.elements.forEach((el) => {
				let p = el.parentElement;
				while (p) {
					if (selector && p.matches(selector)) break;
					results.push(p);
					p = p.parentElement;
				}
			});
			return new DomQuery([...new Set(results)]);
		}
		children(selector) {
			const results = [];
			this.elements.forEach((el) => {
				const kids = Array.from(el.children);
				if (selector) results.push(...kids.filter((c) => c.matches(selector)));
				else results.push(...kids);
			});
			return new DomQuery(results);
		}
		siblings(selector) {
			const results = [];
			this.elements.forEach((el) => {
				const parent = el.parentElement;
				if (!parent) return;
				Array.from(parent.children).forEach((sib) => {
					if (sib !== el && (!selector || sib.matches(selector))) results.push(sib);
				});
			});
			return new DomQuery(results);
		}
		prev() {
			const results = [];
			this.elements.forEach((el) => {
				if (el.previousElementSibling) results.push(el.previousElementSibling);
			});
			return new DomQuery(results);
		}
		next() {
			const results = [];
			this.elements.forEach((el) => {
				if (el.nextElementSibling) results.push(el.nextElementSibling);
			});
			return new DomQuery(results);
		}
		is(selector) {
			if (typeof selector === "string") return this.elements.some((el) => el.matches(selector));
			if (typeof selector === "function") return this.elements.some(selector);
			return false;
		}
		not(selector) {
			return new DomQuery(typeof selector === "string" ? this.elements.filter((el) => !el.matches(selector)) : this.elements.filter((el, i) => !selector.call(el, i, el)));
		}
		eq(index) {
			return new DomQuery(this.get(index) || []);
		}
		append(child) {
			if (typeof child === "string") this.elements.forEach((el) => el.insertAdjacentHTML("beforeend", child));
			else if (child instanceof DomQuery) this.elements.forEach((parent) => {
				child.elements.forEach((c) => parent.appendChild(c));
			});
			else if (child instanceof Element) this.elements.forEach((el) => el.appendChild(child));
			return this;
		}
		appendTo(target) {
			$$(target).append(this);
			return this;
		}
		prepend(child) {
			if (typeof child === "string") this.elements.forEach((el) => el.insertAdjacentHTML("afterbegin", child));
			else if (child instanceof DomQuery) this.elements.forEach((parent) => {
				child.elements.forEach((c) => parent.prepend(c));
			});
			else if (child instanceof Element) this.elements.forEach((el) => el.prepend(child));
			return this;
		}
		prependTo(target) {
			$$(target).prepend(this);
			return this;
		}
		tooltip(option) {
			const bootstrap = getBootstrap();
			if (!bootstrap || !bootstrap.Tooltip) return this;
			this.elements.forEach((element) => {
				const instance = bootstrap.Tooltip.getOrCreateInstance(element, sanitizeBootstrapOptions(option));
				if (typeof option === "string" && typeof instance[option] === "function") instance[option]();
			});
			return this;
		}
		modal(option) {
			const bootstrap = getBootstrap();
			if (!bootstrap || !bootstrap.Modal) {
				this.elements.forEach((element) => {
					if (typeof option === "string") {
						if (option === "show") showFallbackModal(element);
						else if (option === "hide") hideFallbackModal(element);
					}
				});
				return this;
			}
			this.elements.forEach((element) => {
				const instance = bootstrap.Modal.getOrCreateInstance(element, sanitizeBootstrapOptions(option));
				if (typeof option === "string" && typeof instance[option] === "function") instance[option]();
			});
			return this;
		}
		before(content) {
			if (typeof content === "string") this.elements.forEach((el) => el.insertAdjacentHTML("beforebegin", content));
			else if (content instanceof DomQuery) this.elements.forEach((el, targetIndex) => {
				if (!el.parentNode) return;
				content.elements.forEach((node) => {
					const insertNode = targetIndex === 0 ? node : node.cloneNode(true);
					el.parentNode.insertBefore(insertNode, el);
				});
			});
			else if (content instanceof Element) this.elements.forEach((el) => el.parentNode.insertBefore(content, el));
			return this;
		}
		after(content) {
			if (typeof content === "string") this.elements.forEach((el) => el.insertAdjacentHTML("afterend", content));
			else if (content instanceof DomQuery) this.elements.forEach((el, targetIndex) => {
				if (!el.parentNode) return;
				const referenceNode = el.nextSibling;
				content.elements.forEach((node) => {
					const insertNode = targetIndex === 0 ? node : node.cloneNode(true);
					el.parentNode.insertBefore(insertNode, referenceNode);
				});
			});
			else if (content instanceof Element) this.elements.forEach((el) => el.parentNode.insertBefore(content, el.nextSibling));
			return this;
		}
		insertAfter(target) {
			const anchor = target instanceof DomQuery ? target.get(-1) : target;
			if (!anchor || !anchor.parentNode) return this;
			this.elements.forEach((element) => {
				anchor.parentNode.insertBefore(element, anchor.nextSibling);
			});
			return this;
		}
		insertBefore(target) {
			const anchor = target instanceof DomQuery ? target.get(0) : target;
			if (!anchor || !anchor.parentNode) return this;
			this.elements.forEach((element) => {
				anchor.parentNode.insertBefore(element, anchor);
			});
			return this;
		}
		replaceWith(content) {
			this.elements.forEach((el) => {
				if (typeof content === "string") el.outerHTML = content;
				else if (content instanceof DomQuery) {
					const replacement = content.get(0);
					if (replacement) el.parentNode.replaceChild(replacement, el);
				} else if (content instanceof Element) el.parentNode.replaceChild(content, el);
			});
			return this;
		}
		remove() {
			this.elements.forEach((el) => {
				if (el.parentNode) el.parentNode.removeChild(el);
			});
			this.elements = [];
			return this.refreshCollection();
		}
		detach() {
			this.elements.forEach((el) => {
				if (el.parentNode) el.parentNode.removeChild(el);
			});
			return this;
		}
		empty() {
			this.elements.forEach((el) => {
				el.innerHTML = "";
			});
			return this;
		}
		clone(deep = true) {
			return new DomQuery(this.elements.map((el) => el.cloneNode(deep)));
		}
		wrap(wrapper) {
			const wrapperHTML = typeof wrapper === "string" ? wrapper : wrapper.outerHTML;
			this.elements.forEach((el) => {
				const wrap = el.ownerDocument.createElement("div");
				wrap.innerHTML = wrapperHTML;
				const wrapperEl = wrap.firstChild;
				el.parentNode.insertBefore(wrapperEl, el);
				wrapperEl.appendChild(el);
			});
			return this;
		}
		unwrap() {
			this.elements.forEach((el) => {
				const parent = el.parentNode;
				if (parent && parent !== document.body) {
					while (parent.firstChild) parent.parentNode.insertBefore(parent.firstChild, parent);
					parent.remove();
				}
			});
			return this;
		}
		on(event, selectorOrHandler, handler) {
			const eventNames = getEventNames(event);
			if (typeof selectorOrHandler === "function") {
				const h = selectorOrHandler;
				this.elements.forEach((el) => {
					const wrapped = (nativeEvent) => {
						const event = normalizeEvent(nativeEvent, el);
						const detail = normalizeEventDetail(event.detail);
						h.call(el, event, ...detail);
					};
					eventNames.forEach((eventName) => el.addEventListener(eventName, wrapped));
					if (!el._domQueryHandlers) el._domQueryHandlers = [];
					eventNames.forEach((eventName) => {
						el._domQueryHandlers.push({
							event: eventName,
							handler: h,
							wrapper: wrapped
						});
					});
				});
			} else if (typeof selectorOrHandler === "string" && typeof handler === "function") {
				const selector = selectorOrHandler;
				const h = (nativeEvent) => {
					const e = normalizeEvent(nativeEvent);
					const target = e.target instanceof Element ? e.target.closest(selector) : null;
					if (target && this.elements.some((el) => el.contains(target))) {
						const event = normalizeEvent(e, target);
						const detail = normalizeEventDetail(event.detail);
						handler.call(target, event, ...detail);
					}
				};
				this.elements.forEach((el) => {
					eventNames.forEach((eventName) => el.addEventListener(eventName, h));
					if (!el._domQueryHandlers) el._domQueryHandlers = [];
					eventNames.forEach((eventName) => {
						el._domQueryHandlers.push({
							event: eventName,
							selector,
							handler,
							wrapper: h
						});
					});
				});
			}
			return this;
		}
		off(event, handler) {
			const eventNames = getEventNames(event);
			this.elements.forEach((el) => {
				if (!eventNames.length && el._domQueryHandlers) {
					el._domQueryHandlers.forEach((registered) => {
						el.removeEventListener(registered.event, registered.wrapper);
					});
					el._domQueryHandlers = [];
					return;
				}
				if (handler) if (el._domQueryHandlers) {
					el._domQueryHandlers.filter((registered) => eventNames.includes(registered.event) && registered.handler === handler).forEach((registered) => el.removeEventListener(registered.event, registered.wrapper));
					el._domQueryHandlers = el._domQueryHandlers.filter((registered) => !(eventNames.includes(registered.event) && registered.handler === handler));
				} else eventNames.forEach((eventName) => el.removeEventListener(eventName, handler));
				else if (el._domQueryHandlers) {
					el._domQueryHandlers.filter((h) => eventNames.includes(h.event)).forEach((h) => el.removeEventListener(h.event, h.wrapper));
					el._domQueryHandlers = el._domQueryHandlers.filter((h) => !eventNames.includes(h.event));
				} else {
					const clone = el.cloneNode(true);
					if (!el.parentNode) return;
					el.parentNode.replaceChild(clone, el);
					const idx = this.elements.indexOf(el);
					this.elements[idx] = clone;
				}
			});
			return this.refreshCollection();
		}
		one(event, handler) {
			const eventNames = getEventNames(event);
			const wrapper = (e) => {
				const event = normalizeEvent(e, e.currentTarget);
				const detail = normalizeEventDetail(event.detail);
				handler.call(e.currentTarget, event, ...detail);
				eventNames.forEach((eventName) => e.currentTarget.removeEventListener(eventName, wrapper));
			};
			this.elements.forEach((el) => {
				eventNames.forEach((eventName) => el.addEventListener(eventName, wrapper));
			});
			return this;
		}
		trigger(event, detail) {
			const eventNames = typeof event === "string" ? getEventNames(event) : [event];
			this.elements.forEach((el) => {
				eventNames.forEach((eventName) => {
					if (typeof eventName === "string") {
						if (detail === void 0 && eventName === "focus" && typeof el.focus === "function") {
							el.focus();
							return;
						}
						if (detail === void 0 && eventName === "blur" && typeof el.blur === "function") {
							el.blur();
							return;
						}
						if (detail === void 0 && eventName === "click" && typeof el.click === "function") {
							el.click();
							return;
						}
						const evt = detail === void 0 ? new Event(eventName, {
							bubbles: true,
							cancelable: true
						}) : new CustomEvent(eventName, {
							bubbles: true,
							cancelable: true,
							detail
						});
						el.dispatchEvent(normalizeEvent(evt, el));
						return;
					}
					el.dispatchEvent(normalizeEvent(eventName, el));
				});
			});
			return this;
		}
		show() {
			this.elements.forEach((el) => {
				const store = getElementDataStore(el);
				el.style.display = store.previousDisplay ?? "";
				if (getComputedStyle(el).display === "none") el.style.display = getDefaultDisplay(el.tagName);
			});
			return this;
		}
		hide() {
			this.elements.forEach((el) => {
				const store = getElementDataStore(el);
				if (el.style.display !== "none") store.previousDisplay = el.style.display;
				el.style.display = "none";
			});
			return this;
		}
		toggle(show) {
			this.elements.forEach((el) => {
				if (show === void 0) el.style.display = el.style.display === "none" ? "" : "none";
				else el.style.display = show ? "" : "none";
			});
			return this;
		}
		width(value) {
			if (value === void 0) {
				const el = this.get(0);
				if (isWindowObject(el)) return el.innerWidth;
				if (isDocumentObject(el)) return document.documentElement.clientWidth || 0;
				return el ? el.offsetWidth : 0;
			}
			this.elements.forEach((el) => {
				el.style.width = typeof value === "number" ? value + "px" : value;
			});
			return this;
		}
		height(value) {
			if (value === void 0) {
				const el = this.get(0);
				if (isWindowObject(el)) return el.innerHeight;
				if (isDocumentObject(el)) return document.documentElement.clientHeight || 0;
				return el ? el.offsetHeight : 0;
			}
			this.elements.forEach((el) => {
				el.style.height = typeof value === "number" ? value + "px" : value;
			});
			return this;
		}
		innerWidth() {
			const el = this.get(0);
			if (isWindowObject(el)) return el.innerWidth;
			if (isDocumentObject(el)) return document.documentElement.clientWidth || 0;
			return el ? el.clientWidth : 0;
		}
		innerHeight() {
			const el = this.get(0);
			if (isWindowObject(el)) return el.innerHeight;
			if (isDocumentObject(el)) return document.documentElement.clientHeight || 0;
			return el ? el.clientHeight : 0;
		}
		outerWidth(includeMargin) {
			const el = this.get(0);
			if (!el) return 0;
			if (isWindowObject(el)) return el.innerWidth;
			if (isDocumentObject(el)) return document.documentElement.clientWidth || 0;
			let w = el.offsetWidth;
			if (includeMargin) {
				const style = getComputedStyle(el);
				w += parseFloat(style.marginLeft) + parseFloat(style.marginRight);
			}
			return w;
		}
		outerHeight(includeMargin) {
			const el = this.get(0);
			if (!el) return 0;
			if (isWindowObject(el)) return el.innerHeight;
			if (isDocumentObject(el)) return document.documentElement.clientHeight || 0;
			let h = el.offsetHeight;
			if (includeMargin) {
				const style = getComputedStyle(el);
				h += parseFloat(style.marginTop) + parseFloat(style.marginBottom);
			}
			return h;
		}
		offset() {
			const el = this.get(0);
			if (!el) return {
				top: 0,
				left: 0
			};
			const rect = el.getBoundingClientRect();
			return {
				top: rect.top + window.pageYOffset,
				left: rect.left + window.pageXOffset
			};
		}
		position() {
			const el = this.get(0);
			if (!el) return {
				top: 0,
				left: 0
			};
			return {
				top: el.offsetTop,
				left: el.offsetLeft
			};
		}
		scrollTop(value) {
			const el = this.get(0);
			const scrollContainer = getScrollContainer(el);
			if (value === void 0) {
				if (!el) return 0;
				return scrollContainer.scrollTop;
			}
			this.elements.forEach((element) => {
				const target = getScrollContainer(element);
				if (!target) return;
				if (isWindowObject(element)) {
					element.scrollTo(element.scrollX, value);
					return;
				}
				target.scrollTop = value;
			});
			return this;
		}
		focus() {
			this.elements.forEach((el) => el.focus());
			return this;
		}
		blur() {
			this.elements.forEach((el) => el.blur());
			return this;
		}
		select() {
			const el = this.get(0);
			if (el && el.select) el.select();
			return this;
		}
		serialize() {
			const el = this.get(0);
			if (!el || !el.elements) return "";
			return new URLSearchParams(new FormData(el)).toString();
		}
		get [Symbol.iterator]() {
			return this.elements[Symbol.iterator];
		}
	};
	/**
	* Main selector function. Usage: $$('selector') or $$(element)
	*/
	function $$(selector, context) {
		return new DomQuery(selector, context);
	}
	$$.isArray = Array.isArray;
	$$.isFunction = (fn) => typeof fn === "function";
	$$.isNumeric = (n) => !isNaN(parseFloat(n)) && isFinite(n);
	$$.isWindow = (obj) => obj != null && obj === obj.window;
	$$.trim = (str) => str ? str.trim() : "";
	$$.inArray = (value, array) => Array.isArray(array) ? array.indexOf(value) : -1;
	$$.each = (obj, callback) => {
		if (Array.isArray(obj)) obj.forEach((val, i) => callback(i, val));
		else if (typeof obj === "object" && obj !== null) Object.entries(obj).forEach(([key, val]) => callback(key, val));
		return obj;
	};
	$$.contains = (parent, child) => parent && child ? parent.contains(child) : false;
	$$.noop = () => {};
	$$.proxy = (fn, context, ...args) => fn.bind(context, ...args);
	$$.ajax = (options) => {
		const opts = Object.assign({
			method: "GET",
			headers: {},
			data: null
		}, options);
		return fetch(opts.url, {
			method: opts.method,
			headers: opts.headers,
			body: opts.data ? typeof opts.data === "string" ? opts.data : JSON.stringify(opts.data) : null
		}).then((response) => {
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return response.text();
		}).then((html) => {
			if (opts.success) opts.success(html);
			return html;
		}).catch((err) => {
			if (opts.error) opts.error(err);
			throw err;
		});
	};
	$$.parseHTML = (html) => {
		return parseHTMLString(html);
	};
	$$.extend = (deepOrTarget, ...args) => {
		if (deepOrTarget === true) {
			const target = args[0];
			const sources = args.slice(1);
			for (const source of sources) if (source && typeof source === "object") for (const key of Object.keys(source)) if (isPlainObject(source[key])) {
				if (!target[key]) target[key] = {};
				$$.extend(true, target[key], source[key]);
			} else target[key] = source[key];
			return target;
		}
		const target = deepOrTarget;
		for (const source of args) if (source && typeof source === "object") Object.assign(target, source);
		return target;
	};
	$$.summernote = $$.summernote || { lang: {} };
	//#endregion
	//#region src/js/summernote-en-US.js
	$$.summernote = $$.summernote || { lang: {} };
	$$.extend(true, $$.summernote.lang, { "en-US": {
		font: {
			bold: "Bold",
			italic: "Italic",
			underline: "Underline",
			clear: "Remove Font Style",
			height: "Line Height",
			name: "Font Family",
			strikethrough: "Strikethrough",
			subscript: "Subscript",
			superscript: "Superscript",
			size: "Font Size",
			sizeunit: "Font Size Unit"
		},
		image: {
			image: "Picture",
			insert: "Insert Image",
			resizeFull: "Resize full",
			resizeHalf: "Resize half",
			resizeQuarter: "Resize quarter",
			resizeNone: "Original size",
			floatLeft: "Float Left",
			floatRight: "Float Right",
			floatNone: "Remove float",
			shapeRounded: "Shape: Rounded",
			shapeCircle: "Shape: Circle",
			shapeThumbnail: "Shape: Thumbnail",
			shapeNone: "Shape: None",
			dragImageHere: "Drag image or text here",
			dropImage: "Drop image or Text",
			selectFromFiles: "Select from files",
			maximumFileSize: "Maximum file size",
			maximumFileSizeError: "Maximum file size exceeded.",
			url: "Image URL",
			remove: "Remove Image",
			original: "Original"
		},
		video: {
			video: "Video",
			videoLink: "Video Link",
			insert: "Insert Video",
			play: "Play",
			resizeFull: "Resize full",
			resizeHalf: "Resize half",
			resizeQuarter: "Resize quarter",
			resizeNone: "Original size",
			floatLeft: "Float Left",
			floatRight: "Float Right",
			floatNone: "Remove float",
			url: "Video URL",
			remove: "Remove Video",
			providers: "(YouTube, Google Drive, Vimeo, Vine, Instagram, DailyMotion, Youku, Peertube)"
		},
		link: {
			link: "Link",
			insert: "Insert Link",
			unlink: "Unlink",
			edit: "Edit",
			textToDisplay: "Text to display",
			url: "To what URL should this link go?",
			openInNewWindow: "Open in new window"
		},
		table: {
			table: "Table",
			addRowAbove: "Add row above",
			addRowBelow: "Add row below",
			addColLeft: "Add column left",
			addColRight: "Add column right",
			delRow: "Delete row",
			delCol: "Delete column",
			delTable: "Delete table"
		},
		hr: { insert: "Insert Horizontal Rule" },
		style: {
			style: "Style",
			p: "Normal",
			blockquote: "Quote",
			pre: "Code",
			h1: "Header 1",
			h2: "Header 2",
			h3: "Header 3",
			h4: "Header 4",
			h5: "Header 5",
			h6: "Header 6"
		},
		lists: {
			unordered: "Unordered list",
			ordered: "Ordered list"
		},
		options: {
			help: "Help",
			fullscreen: "Full Screen",
			codeview: "Code View"
		},
		paragraph: {
			paragraph: "Paragraph",
			outdent: "Outdent",
			indent: "Indent",
			left: "Align left",
			center: "Align center",
			right: "Align right",
			justify: "Justify full"
		},
		color: {
			recent: "Recent Color",
			more: "More Color",
			background: "Background Color",
			foreground: "Text Color",
			transparent: "Transparent",
			setTransparent: "Set transparent",
			reset: "Reset",
			resetToDefault: "Reset to default",
			cpSelect: "Select",
			colorsName: [
				[
					"Black",
					"Tundora",
					"Dove Gray",
					"Star Dust",
					"Pale Slate",
					"Gallery",
					"Alabaster",
					"White"
				],
				[
					"Red",
					"Orange Peel",
					"Yellow",
					"Green",
					"Cyan",
					"Blue",
					"Electric Violet",
					"Magenta"
				],
				[
					"Azalea",
					"Karry",
					"Egg White",
					"Zanah",
					"Botticelli",
					"Tropical Blue",
					"Mischka",
					"Twilight"
				],
				[
					"Tonys Pink",
					"Peach Orange",
					"Cream Brulee",
					"Sprout",
					"Casper",
					"Perano",
					"Cold Purple",
					"Careys Pink"
				],
				[
					"Mandy",
					"Rajah",
					"Dandelion",
					"Olivine",
					"Gulf Stream",
					"Viking",
					"Blue Marguerite",
					"Puce"
				],
				[
					"Guardsman Red",
					"Fire Bush",
					"Golden Dream",
					"Chelsea Cucumber",
					"Smalt Blue",
					"Boston Blue",
					"Butterfly Bush",
					"Cadillac"
				],
				[
					"Sangria",
					"Mai Tai",
					"Buddha Gold",
					"Forest Green",
					"Eden",
					"Venice Blue",
					"Meteorite",
					"Claret"
				],
				[
					"Rosewood",
					"Cinnamon",
					"Olive",
					"Parsley",
					"Tiber",
					"Midnight Blue",
					"Valentino",
					"Loulou"
				]
			]
		},
		shortcut: {
			shortcuts: "Keyboard shortcuts",
			close: "Close",
			textFormatting: "Text formatting",
			action: "Action",
			paragraphFormatting: "Paragraph formatting",
			documentStyle: "Document Style",
			extraKeys: "Extra keys"
		},
		help: {
			"escape": "Escape",
			"insertParagraph": "Insert Paragraph",
			"undo": "Undo the last command",
			"redo": "Redo the last command",
			"tab": "Tab",
			"untab": "Untab",
			"bold": "Set a bold style",
			"italic": "Set a italic style",
			"underline": "Set a underline style",
			"strikethrough": "Set a strikethrough style",
			"removeFormat": "Clean a style",
			"justifyLeft": "Set left align",
			"justifyCenter": "Set center align",
			"justifyRight": "Set right align",
			"justifyFull": "Set full align",
			"insertUnorderedList": "Toggle unordered list",
			"insertOrderedList": "Toggle ordered list",
			"outdent": "Outdent on current paragraph",
			"indent": "Indent on current paragraph",
			"formatPara": "Change current block's format as a paragraph(P tag)",
			"formatH1": "Change current block's format as H1",
			"formatH2": "Change current block's format as H2",
			"formatH3": "Change current block's format as H3",
			"formatH4": "Change current block's format as H4",
			"formatH5": "Change current block's format as H5",
			"formatH6": "Change current block's format as H6",
			"insertHorizontalRule": "Insert horizontal rule",
			"linkDialog.show": "Show Link Dialog"
		},
		history: {
			undo: "Undo",
			redo: "Redo"
		},
		specialChar: {
			specialChar: "SPECIAL CHARACTERS",
			select: "Select Special characters",
			insert: "Insert selected symbol"
		},
		output: { noSelection: "No Selection Made!" },
		helpDialog: {
			brand: "Summernote Next",
			platform: {
				mac: "macOS",
				pc: "Windows and Linux"
			},
			links: {
				examples: "Examples",
				project: "Project",
				issues: "Issues"
			}
		}
	} });
	//#endregion
	//#region src/js/core/env.js
	function hasDocument() {
		return typeof document !== "undefined";
	}
	/**
	* returns whether font is installed or not.
	*
	* @param {String} fontName
	* @return {Boolean}
	*/
	var genericFontFamilies = [
		"sans-serif",
		"serif",
		"monospace",
		"cursive",
		"fantasy"
	];
	function validFontName(fontName) {
		return genericFontFamilies.indexOf(fontName.toLowerCase()) === -1 ? `'${fontName}'` : fontName;
	}
	function createIsFontInstalledFunc() {
		const testText = "mw";
		const canvasWidth = 40;
		const canvasHeight = 20;
		var canvas = document.createElement("canvas");
		var context = canvas.getContext("2d", { willReadFrequently: true });
		canvas.width = canvasWidth;
		canvas.height = canvasHeight;
		context.textAlign = "center";
		context.fillStyle = "black";
		context.textBaseline = "middle";
		function getPxInfo(font, testFontName) {
			context.clearRect(0, 0, canvasWidth, canvasHeight);
			context.font = "20px " + validFontName(font) + ", \"" + testFontName + "\"";
			context.fillText(testText, canvasWidth / 2, canvasHeight / 2);
			return context.getImageData(0, 0, canvasWidth, canvasHeight).data.join("");
		}
		return (fontName) => {
			const testFontName = fontName === "Comic Sans MS" ? "Courier New" : "Comic Sans MS";
			return getPxInfo(testFontName, testFontName) !== getPxInfo(fontName, testFontName);
		};
	}
	var userAgent = navigator.userAgent;
	var isMSIE = /MSIE|Trident/i.test(userAgent);
	var browserVersion;
	if (isMSIE) {
		let matches = /MSIE (\d+[.]\d+)/.exec(userAgent);
		if (matches) browserVersion = parseFloat(matches[1]);
		matches = /Trident\/.*rv:([0-9]{1,}[.0-9]{0,})/.exec(userAgent);
		if (matches) browserVersion = parseFloat(matches[1]);
	}
	var isEdge = /Edge\/\d+/.test(userAgent);
	var isSupportTouch = "ontouchstart" in window || navigator.MaxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
	var inputEventName = isMSIE ? "DOMCharacterDataModified DOMSubtreeModified DOMNodeInserted" : "input";
	/**
	* @class core.env
	*
	* Object which check platform and agent
	*
	* @singleton
	* @alternateClassName env
	*/
	var env_default = {
		isMac: navigator.appVersion.indexOf("Mac") > -1,
		isMSIE,
		isEdge,
		isFF: !isEdge && /firefox/i.test(userAgent),
		isPhantom: /PhantomJS/i.test(userAgent),
		isWebkit: !isEdge && /webkit/i.test(userAgent),
		isChrome: !isEdge && /chrome/i.test(userAgent),
		isSafari: !isEdge && /safari/i.test(userAgent) && !/chrome/i.test(userAgent),
		browserVersion,
		isSupportTouch,
		isFontInstalled: createIsFontInstalledFunc(),
		isW3CRangeSupport: !!document.createRange,
		inputEventName,
		genericFontFamilies,
		validFontName,
		hasDocument
	};
	//#endregion
	//#region src/js/core/func.js
	/**
	* @class core.func
	*
	* func utils (for high-order func's arg)
	*
	* @singleton
	* @alternateClassName func
	*/
	function eq(itemA) {
		return function(itemB) {
			return itemA === itemB;
		};
	}
	function eq2(itemA, itemB) {
		return itemA === itemB;
	}
	function peq2(propName) {
		return function(itemA, itemB) {
			return itemA[propName] === itemB[propName];
		};
	}
	function ok() {
		return true;
	}
	function fail() {
		return false;
	}
	function not(f) {
		return function() {
			return !f.apply(f, arguments);
		};
	}
	function and(fA, fB) {
		return function(item) {
			return fA(item) && fB(item);
		};
	}
	function self(a) {
		return a;
	}
	function invoke(obj, method) {
		return function() {
			return obj[method].apply(obj, arguments);
		};
	}
	var idCounter = 0;
	/**
	* reset globally-unique id
	*
	*/
	function resetUniqueId() {
		idCounter = 0;
	}
	/**
	* generate a globally-unique id
	*
	* @param {String} [prefix]
	*/
	function uniqueId(prefix) {
		const id = ++idCounter + "";
		return prefix ? prefix + id : id;
	}
	/**
	* returns bnd (bounds) from rect
	*
	* - IE Compatibility Issue: http://goo.gl/sRLOAo
	* - Scroll Issue: http://goo.gl/sNjUc
	*
	* @param {Rect} rect
	* @return {Object} bounds
	* @return {Number} bounds.top
	* @return {Number} bounds.left
	* @return {Number} bounds.width
	* @return {Number} bounds.height
	*/
	function rect2bnd(rect) {
		if (!rect) return {
			top: 0,
			left: 0,
			width: 0,
			height: 0
		};
		return {
			top: rect.top + window.scrollY,
			left: rect.left + window.scrollX,
			width: rect.right - rect.left,
			height: rect.bottom - rect.top
		};
	}
	/**
	* returns a copy of the object where the keys have become the values and the values the keys.
	* @param {Object} obj
	* @return {Object}
	*/
	function invertObject(obj) {
		const inverted = {};
		for (const key in obj) if (Object.prototype.hasOwnProperty.call(obj, key)) inverted[obj[key]] = key;
		return inverted;
	}
	/**
	* @param {String} namespace
	* @param {String} [prefix]
	* @return {String}
	*/
	function namespaceToCamel(namespace, prefix) {
		prefix = prefix || "";
		return prefix + namespace.split(".").map(function(name) {
			return name.substring(0, 1).toUpperCase() + name.substring(1);
		}).join("");
	}
	/**
	* Returns a function, that, as long as it continues to be invoked, will not
	* be triggered. The function will be called after it stops being called for
	* N milliseconds. If `immediate` is passed, trigger the function on the
	* leading edge, instead of the trailing.
	* @param {Function} func
	* @param {Number} wait
	* @param {Boolean} immediate
	* @return {Function}
	*/
	function debounce(func, wait, immediate) {
		let timeout;
		return function() {
			const context = this;
			const args = arguments;
			const later = () => {
				timeout = null;
				if (!immediate) func.apply(context, args);
			};
			const callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow) func.apply(context, args);
		};
	}
	/**
	*
	* @param {String} url
	* @return {Boolean}
	*/
	function isValidUrl(url) {
		return /[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi.test(url);
	}
	var func_default = {
		eq,
		eq2,
		peq2,
		ok,
		fail,
		self,
		not,
		and,
		invoke,
		resetUniqueId,
		uniqueId,
		rect2bnd,
		invertObject,
		namespaceToCamel,
		debounce,
		isValidUrl
	};
	//#endregion
	//#region src/js/core/lists.js
	/**
	* returns the first item of an array.
	*
	* @param {Array} array
	*/
	function head(array) {
		return array[0];
	}
	/**
	* returns the last item of an array.
	*
	* @param {Array} array
	*/
	function last(array) {
		return array[array.length - 1];
	}
	/**
	* returns everything but the last entry of the array.
	*
	* @param {Array} array
	*/
	function initial(array) {
		return array.slice(0, array.length - 1);
	}
	/**
	* returns the rest of the items in an array.
	*
	* @param {Array} array
	*/
	function tail(array) {
		return array.slice(1);
	}
	/**
	* returns item of array
	*/
	function find(array, pred) {
		for (let idx = 0, len = array.length; idx < len; idx++) {
			const item = array[idx];
			if (pred(item)) return item;
		}
	}
	/**
	* returns true if all of the values in the array pass the predicate truth test.
	*/
	function all(array, pred) {
		for (let idx = 0, len = array.length; idx < len; idx++) if (!pred(array[idx])) return false;
		return true;
	}
	/**
	* returns true if the value is present in the list.
	*/
	function contains(array, item) {
		if (array && array.length && item) {
			if (array.indexOf) return array.indexOf(item) !== -1;
			else if (array.contains) return array.contains(item);
		}
		return false;
	}
	/**
	* get sum from a list
	*
	* @param {Array} array - array
	* @param {Function} fn - iterator
	*/
	function sum(array, fn) {
		fn = fn || func_default.self;
		return array.reduce(function(memo, v) {
			return memo + fn(v);
		}, 0);
	}
	/**
	* returns a copy of the collection with array type.
	* @param {Collection} collection - collection eg) node.childNodes, ...
	*/
	function from(collection) {
		const result = [];
		const length = collection.length;
		let idx = -1;
		while (++idx < length) result[idx] = collection[idx];
		return result;
	}
	/**
	* returns whether list is empty or not
	*/
	function isEmpty$1(array) {
		return !array || !array.length;
	}
	/**
	* cluster elements by predicate function.
	*
	* @param {Array} array - array
	* @param {Function} fn - predicate function for cluster rule
	* @param {Array[]}
	*/
	function clusterBy(array, fn) {
		if (!array.length) return [];
		return tail(array).reduce(function(memo, v) {
			const aLast = last(memo);
			if (fn(last(aLast), v)) aLast[aLast.length] = v;
			else memo[memo.length] = [v];
			return memo;
		}, [[head(array)]]);
	}
	/**
	* returns a copy of the array with all false values removed
	*
	* @param {Array} array - array
	* @param {Function} fn - predicate function for cluster rule
	*/
	function compact(array) {
		const aResult = [];
		for (let idx = 0, len = array.length; idx < len; idx++) if (array[idx]) aResult.push(array[idx]);
		return aResult;
	}
	/**
	* produces a duplicate-free version of the array
	*
	* @param {Array} array
	*/
	function unique(array) {
		const results = [];
		for (let idx = 0, len = array.length; idx < len; idx++) if (!contains(results, array[idx])) results.push(array[idx]);
		return results;
	}
	/**
	* returns next item.
	* @param {Array} array
	*/
	function next(array, item) {
		if (array && array.length && item) {
			const idx = array.indexOf(item);
			return idx === -1 ? null : array[idx + 1];
		}
		return null;
	}
	/**
	* returns prev item.
	* @param {Array} array
	*/
	function prev(array, item) {
		if (array && array.length && item) {
			const idx = array.indexOf(item);
			return idx === -1 ? null : array[idx - 1];
		}
		return null;
	}
	/**
	* @class core.list
	*
	* list utils
	*
	* @singleton
	* @alternateClassName list
	*/
	var lists_default = {
		head,
		last,
		initial,
		tail,
		prev,
		next,
		find,
		contains,
		all,
		sum,
		from,
		isEmpty: isEmpty$1,
		clusterBy,
		compact,
		unique
	};
	//#endregion
	//#region src/js/core/dom.js
	var NBSP_CHAR = String.fromCharCode(160);
	var ZERO_WIDTH_NBSP_CHAR = "﻿";
	/**
	* @method isEditable
	*
	* returns whether node is `note-editable` or not.
	*
	* @param {Node} node
	* @return {Boolean}
	*/
	function isEditable(node) {
		return node && $$(node).hasClass("note-editable");
	}
	/**
	* @method isControlSizing
	*
	* returns whether node is `note-control-sizing` or not.
	*
	* @param {Node} node
	* @return {Boolean}
	*/
	function isControlSizing(node) {
		return node && $$(node).hasClass("note-control-sizing");
	}
	/**
	* @method makePredByNodeName
	*
	* returns predicate which judge whether nodeName is same
	*
	* @param {String} nodeName
	* @return {Function}
	*/
	function makePredByNodeName(nodeName) {
		nodeName = nodeName.toUpperCase();
		return function(node) {
			return node && node.nodeName.toUpperCase() === nodeName;
		};
	}
	/**
	* @method isText
	*
	*
	*
	* @param {Node} node
	* @return {Boolean} true if node's type is text(3)
	*/
	function isText(node) {
		return node && node.nodeType === 3;
	}
	/**
	* @method isElement
	*
	*
	*
	* @param {Node} node
	* @return {Boolean} true if node's type is element(1)
	*/
	function isElement(node) {
		return node && node.nodeType === 1;
	}
	/**
	* ex) br, col, embed, hr, img, input, ...
	* @see http://www.w3.org/html/wg/drafts/html/master/syntax.html#void-elements
	*/
	function isVoid(node) {
		return node && /^BR|^IMG|^HR|^IFRAME|^BUTTON|^INPUT|^AUDIO|^VIDEO|^EMBED/.test(node.nodeName.toUpperCase());
	}
	function isPara(node) {
		if (isEditable(node)) return false;
		return node && /^DIV|^P|^LI|^H[1-7]/.test(node.nodeName.toUpperCase());
	}
	function isHeading(node) {
		return node && /^H[1-7]/.test(node.nodeName.toUpperCase());
	}
	var isPre = makePredByNodeName("PRE");
	var isLi = makePredByNodeName("LI");
	function isPurePara(node) {
		return isPara(node) && !isLi(node);
	}
	var isTable = makePredByNodeName("TABLE");
	var isData = makePredByNodeName("DATA");
	function isInline(node) {
		return !isBodyContainer(node) && !isList(node) && !isHr(node) && !isPara(node) && !isTable(node) && !isBlockquote(node) && !isData(node);
	}
	function isList(node) {
		return node && /^UL|^OL/.test(node.nodeName.toUpperCase());
	}
	var isHr = makePredByNodeName("HR");
	function isCell(node) {
		return node && /^TD|^TH/.test(node.nodeName.toUpperCase());
	}
	var isBlockquote = makePredByNodeName("BLOCKQUOTE");
	function isBodyContainer(node) {
		return isCell(node) || isBlockquote(node) || isEditable(node);
	}
	var isAnchor = makePredByNodeName("A");
	var isImg = makePredByNodeName("IMG");
	var isVideo = makePredByNodeName("VIDEO");
	var isIframe = makePredByNodeName("IFRAME");
	function isParaInline(node) {
		return isInline(node) && !!ancestor(node, isPara);
	}
	function isBodyInline(node) {
		return isInline(node) && !ancestor(node, isPara);
	}
	var isBody = makePredByNodeName("BODY");
	/**
	* returns whether nodeB is closest sibling of nodeA
	*
	* @param {Node} nodeA
	* @param {Node} nodeB
	* @return {Boolean}
	*/
	function isClosestSibling(nodeA, nodeB) {
		return nodeA.nextSibling === nodeB || nodeA.previousSibling === nodeB;
	}
	/**
	* returns array of closest siblings with node
	*
	* @param {Node} node
	* @param {function} [pred] - predicate function
	* @return {Node[]}
	*/
	function withClosestSiblings(node, pred) {
		pred = pred || func_default.ok;
		const siblings = [];
		if (node.previousSibling && pred(node.previousSibling)) siblings.push(node.previousSibling);
		siblings.push(node);
		if (node.nextSibling && pred(node.nextSibling)) siblings.push(node.nextSibling);
		return siblings;
	}
	/**
	* blank HTML for cursor position
	* - [workaround] old IE only works with &nbsp;
	* - [workaround] IE11 and other browser works with bogus br
	*/
	var blankHTML = "<br>";
	/**
	* @method nodeLength
	*
	* returns #text's text size or element's childNodes size
	*
	* @param {Node} node
	*/
	function nodeLength(node) {
		if (isText(node)) return node.nodeValue.length;
		if (node) return node.childNodes.length;
		return 0;
	}
	/**
	* returns whether deepest child node is empty or not.
	*
	* @param {Node} node
	* @return {Boolean}
	*/
	function deepestChildIsEmpty(node) {
		do
			if (node.firstElementChild === null || node.firstElementChild.innerHTML === "") break;
		while (node = node.firstElementChild);
		return isEmpty(node);
	}
	/**
	* returns whether node is empty or not.
	*
	* @param {Node} node
	* @return {Boolean}
	*/
	function isEmpty(node) {
		const len = nodeLength(node);
		if (len === 0) return true;
		else if (!isText(node) && len === 1 && node.innerHTML === blankHTML) return true;
		else if (lists_default.all(node.childNodes, isText) && node.innerHTML === "") return true;
		return false;
	}
	/**
	* padding blankHTML if node is empty (for cursor position)
	*/
	function paddingBlankHTML(node) {
		if (!isVoid(node) && !nodeLength(node)) node.innerHTML = blankHTML;
	}
	/**
	* find nearest ancestor predicate hit
	*
	* @param {Node} node
	* @param {Function} pred - predicate function
	*/
	function ancestor(node, pred) {
		while (node) {
			if (pred(node)) return node;
			if (isEditable(node)) break;
			node = node.parentNode;
		}
		return null;
	}
	/**
	* find nearest ancestor only single child blood line and predicate hit
	*
	* @param {Node} node
	* @param {Function} pred - predicate function
	*/
	function singleChildAncestor(node, pred) {
		node = node.parentNode;
		while (node) {
			if (nodeLength(node) !== 1) break;
			if (pred(node)) return node;
			if (isEditable(node)) break;
			node = node.parentNode;
		}
		return null;
	}
	/**
	* returns new array of ancestor nodes (until predicate hit).
	*
	* @param {Node} node
	* @param {Function} [optional] pred - predicate function
	*/
	function listAncestor(node, pred) {
		pred = pred || func_default.fail;
		const ancestors = [];
		ancestor(node, function(el) {
			if (!isEditable(el)) ancestors.push(el);
			return pred(el);
		});
		return ancestors;
	}
	/**
	* find farthest ancestor predicate hit
	*/
	function lastAncestor(node, pred) {
		const ancestors = listAncestor(node);
		return lists_default.last(ancestors.filter(pred));
	}
	/**
	* returns common ancestor node between two nodes.
	*
	* @param {Node} nodeA
	* @param {Node} nodeB
	*/
	function commonAncestor(nodeA, nodeB) {
		const ancestors = listAncestor(nodeA);
		for (let n = nodeB; n; n = n.parentNode) if (ancestors.indexOf(n) > -1) return n;
		return null;
	}
	/**
	* listing all previous siblings (until predicate hit).
	*
	* @param {Node} node
	* @param {Function} [optional] pred - predicate function
	*/
	function listPrev(node, pred) {
		pred = pred || func_default.fail;
		const nodes = [];
		while (node) {
			if (pred(node)) break;
			nodes.push(node);
			node = node.previousSibling;
		}
		return nodes;
	}
	/**
	* listing next siblings (until predicate hit).
	*
	* @param {Node} node
	* @param {Function} [pred] - predicate function
	*/
	function listNext(node, pred) {
		pred = pred || func_default.fail;
		const nodes = [];
		while (node) {
			if (pred(node)) break;
			nodes.push(node);
			node = node.nextSibling;
		}
		return nodes;
	}
	/**
	* listing descendant nodes
	*
	* @param {Node} node
	* @param {Function} [pred] - predicate function
	*/
	function listDescendant(node, pred) {
		const descendants = [];
		pred = pred || func_default.ok;
		(function fnWalk(current) {
			if (node !== current && pred(current)) descendants.push(current);
			for (let idx = 0, len = current.childNodes.length; idx < len; idx++) fnWalk(current.childNodes[idx]);
		})(node);
		return descendants;
	}
	/**
	* wrap node with new tag.
	*
	* @param {Node} node
	* @param {Node} tagName of wrapper
	* @return {Node} - wrapper
	*/
	function wrap(node, wrapperName) {
		const parent = node.parentNode;
		const wrapper = document.createElement(wrapperName);
		parent.insertBefore(wrapper, node);
		wrapper.appendChild(node);
		return wrapper;
	}
	/**
	* insert node after preceding
	*
	* @param {Node} node
	* @param {Node} preceding - predicate function
	*/
	function insertAfter(node, preceding) {
		const next = preceding.nextSibling;
		let parent = preceding.parentNode;
		if (next) parent.insertBefore(node, next);
		else parent.appendChild(node);
		return node;
	}
	/**
	* append elements.
	*
	* @param {Node} node
	* @param {Collection} aChild
	*/
	function appendChildNodes(node, aChild, isSkipPaddingBlankHTML) {
		$$.each(aChild, function(idx, child) {
			if (!isSkipPaddingBlankHTML && isLi(node) && node.firstChild === null && isList(child)) node.appendChild(create("br"));
			node.appendChild(child);
		});
		return node;
	}
	/**
	* returns whether boundaryPoint is left edge or not.
	*
	* @param {BoundaryPoint} point
	* @return {Boolean}
	*/
	function isLeftEdgePoint(point) {
		return point.offset === 0;
	}
	/**
	* returns whether boundaryPoint is right edge or not.
	*
	* @param {BoundaryPoint} point
	* @return {Boolean}
	*/
	function isRightEdgePoint(point) {
		return point.offset === nodeLength(point.node);
	}
	/**
	* returns whether boundaryPoint is edge or not.
	*
	* @param {BoundaryPoint} point
	* @return {Boolean}
	*/
	function isEdgePoint(point) {
		return isLeftEdgePoint(point) || isRightEdgePoint(point);
	}
	/**
	* returns whether node is left edge of ancestor or not.
	*
	* @param {Node} node
	* @param {Node} ancestor
	* @return {Boolean}
	*/
	function isLeftEdgeOf(node, ancestor) {
		while (node && node !== ancestor) {
			if (position(node) !== 0) return false;
			node = node.parentNode;
		}
		return true;
	}
	/**
	* returns whether node is right edge of ancestor or not.
	*
	* @param {Node} node
	* @param {Node} ancestor
	* @return {Boolean}
	*/
	function isRightEdgeOf(node, ancestor) {
		if (!ancestor) return false;
		while (node && node !== ancestor) {
			if (position(node) !== nodeLength(node.parentNode) - 1) return false;
			node = node.parentNode;
		}
		return true;
	}
	/**
	* returns whether point is left edge of ancestor or not.
	* @param {BoundaryPoint} point
	* @param {Node} ancestor
	* @return {Boolean}
	*/
	function isLeftEdgePointOf(point, ancestor) {
		return isLeftEdgePoint(point) && isLeftEdgeOf(point.node, ancestor);
	}
	/**
	* returns whether point is right edge of ancestor or not.
	* @param {BoundaryPoint} point
	* @param {Node} ancestor
	* @return {Boolean}
	*/
	function isRightEdgePointOf(point, ancestor) {
		return isRightEdgePoint(point) && isRightEdgeOf(point.node, ancestor);
	}
	/**
	* returns offset from parent.
	*
	* @param {Node} node
	*/
	function position(node) {
		let offset = 0;
		while (node = node.previousSibling) offset += 1;
		return offset;
	}
	function hasChildren(node) {
		return !!(node && node.childNodes && node.childNodes.length);
	}
	/**
	* returns previous boundaryPoint
	*
	* @param {BoundaryPoint} point
	* @param {Boolean} isSkipInnerOffset
	* @return {BoundaryPoint}
	*/
	function prevPoint(point, isSkipInnerOffset) {
		let node;
		let offset;
		if (point.offset === 0) {
			if (isEditable(point.node)) return null;
			node = point.node.parentNode;
			offset = position(point.node);
		} else if (hasChildren(point.node)) {
			node = point.node.childNodes[point.offset - 1];
			offset = nodeLength(node);
		} else {
			node = point.node;
			offset = isSkipInnerOffset ? 0 : point.offset - 1;
		}
		return {
			node,
			offset
		};
	}
	/**
	* returns next boundaryPoint
	*
	* @param {BoundaryPoint} point
	* @param {Boolean} isSkipInnerOffset
	* @return {BoundaryPoint}
	*/
	function nextPoint(point, isSkipInnerOffset) {
		let node, offset;
		if (nodeLength(point.node) === point.offset) {
			if (isEditable(point.node)) return null;
			let nextTextNode = getNextTextNode(point.node);
			if (nextTextNode) {
				node = nextTextNode;
				offset = 0;
			} else {
				node = point.node.parentNode;
				offset = position(point.node) + 1;
			}
		} else if (hasChildren(point.node)) {
			node = point.node.childNodes[point.offset];
			offset = 0;
		} else {
			node = point.node;
			offset = isSkipInnerOffset ? nodeLength(point.node) : point.offset + 1;
		}
		return {
			node,
			offset
		};
	}
	/**
	* Find next boundaryPoint for preorder / depth first traversal of the DOM
	* returns next boundaryPoint with empty node
	*
	* @param {BoundaryPoint} point
	* @param {Boolean} isSkipInnerOffset
	* @return {BoundaryPoint}
	*/
	function nextPointWithEmptyNode(point, isSkipInnerOffset) {
		let node;
		let offset;
		if (nodeLength(point.node) === point.offset) {
			if (isEditable(point.node)) return null;
			node = point.node.parentNode;
			offset = position(point.node) + 1;
			if (isEditable(node)) {
				node = point.node.nextSibling;
				offset = 0;
			}
		} else if (hasChildren(point.node)) {
			node = point.node.childNodes[point.offset];
			offset = 0;
		} else {
			node = point.node;
			offset = isSkipInnerOffset ? nodeLength(point.node) : point.offset + 1;
		}
		return {
			node,
			offset
		};
	}
	function getNextTextNode(actual) {
		if (!actual.nextSibling) return void 0;
		if (actual.parent !== actual.nextSibling.parent) return void 0;
		if (isText(actual.nextSibling)) return actual.nextSibling;
		else return getNextTextNode(actual.nextSibling);
	}
	/**
	* returns whether pointA and pointB is same or not.
	*
	* @param {BoundaryPoint} pointA
	* @param {BoundaryPoint} pointB
	* @return {Boolean}
	*/
	function isSamePoint(pointA, pointB) {
		return pointA.node === pointB.node && pointA.offset === pointB.offset;
	}
	/**
	* returns whether point is visible (can set cursor) or not.
	*
	* @param {BoundaryPoint} point
	* @return {Boolean}
	*/
	function isVisiblePoint(point) {
		if (isText(point.node) || !hasChildren(point.node) || isEmpty(point.node)) return true;
		const leftNode = point.node.childNodes[point.offset - 1];
		const rightNode = point.node.childNodes[point.offset];
		if ((!leftNode || isVoid(leftNode)) && (!rightNode || isVoid(rightNode)) || isTable(rightNode)) return true;
		return false;
	}
	/**
	* @method prevPointUtil
	*
	* @param {BoundaryPoint} point
	* @param {Function} pred
	* @return {BoundaryPoint}
	*/
	function prevPointUntil(point, pred) {
		while (point) {
			if (pred(point)) return point;
			point = prevPoint(point);
		}
		return null;
	}
	/**
	* @method nextPointUntil
	*
	* @param {BoundaryPoint} point
	* @param {Function} pred
	* @return {BoundaryPoint}
	*/
	function nextPointUntil(point, pred) {
		while (point) {
			if (pred(point)) return point;
			point = nextPoint(point);
		}
		return null;
	}
	/**
	* returns whether point has character or not.
	*
	* @param {Point} point
	* @return {Boolean}
	*/
	function isCharPoint(point) {
		if (!isText(point.node)) return false;
		const ch = point.node.nodeValue.charAt(point.offset - 1);
		return ch && ch !== " " && ch !== NBSP_CHAR;
	}
	/**
	* returns whether point has space or not.
	*
	* @param {Point} point
	* @return {Boolean}
	*/
	function isSpacePoint(point) {
		if (!isText(point.node)) return false;
		const ch = point.node.nodeValue.charAt(point.offset - 1);
		return ch === " " || ch === NBSP_CHAR;
	}
	/**
	* @method walkPoint - preorder / depth first traversal of the DOM
	*
	* @param {BoundaryPoint} startPoint
	* @param {BoundaryPoint} endPoint
	* @param {Function} handler
	* @param {Boolean} isSkipInnerOffset
	*/
	function walkPoint(startPoint, endPoint, handler, isSkipInnerOffset) {
		let point = startPoint;
		while (point && point.node) {
			handler(point);
			if (isSamePoint(point, endPoint)) break;
			const isSkipOffset = isSkipInnerOffset && startPoint.node !== point.node && endPoint.node !== point.node;
			point = nextPointWithEmptyNode(point, isSkipOffset);
		}
	}
	/**
	* @method makeOffsetPath
	*
	* return offsetPath(array of offset) from ancestor
	*
	* @param {Node} ancestor - ancestor node
	* @param {Node} node
	*/
	function makeOffsetPath(ancestor, node) {
		return listAncestor(node, func_default.eq(ancestor)).map(position).reverse();
	}
	/**
	* @method fromOffsetPath
	*
	* return element from offsetPath(array of offset)
	*
	* @param {Node} ancestor - ancestor node
	* @param {array} offsets - offsetPath
	*/
	function fromOffsetPath(ancestor, offsets) {
		let current = ancestor;
		for (let i = 0, len = offsets.length; i < len; i++) if (current.childNodes.length <= offsets[i]) current = current.childNodes[current.childNodes.length - 1];
		else current = current.childNodes[offsets[i]];
		return current;
	}
	/**
	* @method splitNode
	*
	* split element or #text
	*
	* @param {BoundaryPoint} point
	* @param {Object} [options]
	* @param {Boolean} [options.isSkipPaddingBlankHTML] - default: false
	* @param {Boolean} [options.isNotSplitEdgePoint] - default: false
	* @param {Boolean} [options.isDiscardEmptySplits] - default: false
	* @return {Node} right node of boundaryPoint
	*/
	function splitNode(point, options) {
		let isSkipPaddingBlankHTML = options && options.isSkipPaddingBlankHTML;
		const isNotSplitEdgePoint = options && options.isNotSplitEdgePoint;
		const isDiscardEmptySplits = options && options.isDiscardEmptySplits;
		if (isDiscardEmptySplits) isSkipPaddingBlankHTML = true;
		if (isEdgePoint(point) && (isText(point.node) || isNotSplitEdgePoint)) {
			if (isLeftEdgePoint(point)) return point.node;
			return point.node.nextSibling;
		}
		if (isText(point.node)) return point.node.splitText(point.offset);
		else {
			const childNode = point.node.childNodes[point.offset];
			let childNodes = listNext(childNode);
			const clone = insertAfter(point.node.cloneNode(false), point.node);
			appendChildNodes(clone, childNodes);
			if (!isSkipPaddingBlankHTML) {
				paddingBlankHTML(point.node);
				paddingBlankHTML(clone);
			}
			if (isDiscardEmptySplits) {
				if (isEmpty(point.node)) remove(point.node);
				if (isEmpty(clone)) {
					remove(clone);
					return point.node.nextSibling;
				}
			}
			return clone;
		}
	}
	/**
	* @method splitTree
	*
	* split tree by point
	*
	* @param {Node} root - split root
	* @param {BoundaryPoint} point
	* @param {Object} [options]
	* @param {Boolean} [options.isSkipPaddingBlankHTML] - default: false
	* @param {Boolean} [options.isNotSplitEdgePoint] - default: false
	* @return {Node} right node of boundaryPoint
	*/
	function splitTree(root, point, options) {
		let ancestors = listAncestor(point.node, func_default.eq(root));
		if (!ancestors.length) return null;
		else if (ancestors.length === 1) return splitNode(point, options);
		if (ancestors.length > 2) {
			let ifHasNextSibling = ancestors.slice(0, ancestors.length - 1).find((item) => item.nextSibling);
			if (ifHasNextSibling && point.offset != 0 && isRightEdgePoint(point)) {
				let nestSibling = ifHasNextSibling.nextSibling;
				let textNode;
				if (nestSibling.nodeType == 1) {
					textNode = nestSibling.childNodes[0];
					ancestors = listAncestor(textNode, func_default.eq(root));
					point = {
						node: textNode,
						offset: 0
					};
				} else if (nestSibling.nodeType == 3 && !nestSibling.data.match(/[\n\r]/g)) {
					textNode = nestSibling;
					ancestors = listAncestor(textNode, func_default.eq(root));
					point = {
						node: textNode,
						offset: 0
					};
				}
			}
		}
		return ancestors.reduce(function(node, parent) {
			if (node === point.node) node = splitNode(point, options);
			return splitNode({
				node: parent,
				offset: node ? position(node) : nodeLength(parent)
			}, options);
		});
	}
	/**
	* split point
	*
	* @param {Point} point
	* @param {Boolean} isInline
	* @return {Object}
	*/
	function splitPoint(point, isInline) {
		const pred = isInline ? isPara : isBodyContainer;
		const ancestors = listAncestor(point.node, pred);
		const topAncestor = lists_default.last(ancestors);
		let splitRoot, container;
		if (pred(topAncestor)) {
			splitRoot = ancestors[ancestors.length - 2];
			container = topAncestor;
		} else {
			splitRoot = topAncestor;
			container = splitRoot.parentNode;
		}
		let pivot = splitRoot && splitTree(splitRoot, point, {
			isSkipPaddingBlankHTML: isInline,
			isNotSplitEdgePoint: isInline
		});
		if (!pivot && container === point.node) pivot = point.node.childNodes[point.offset];
		return {
			rightNode: pivot,
			container
		};
	}
	function create(nodeName) {
		return document.createElement(nodeName);
	}
	function createText(text) {
		return document.createTextNode(text);
	}
	/**
	* @method remove
	*
	* remove node, (isRemoveChild: remove child or not)
	*
	* @param {Node} node
	* @param {Boolean} isRemoveChild
	*/
	function remove(node, isRemoveChild) {
		if (!node || !node.parentNode) return;
		if (node.removeNode) return node.removeNode(isRemoveChild);
		const parent = node.parentNode;
		if (!isRemoveChild) {
			const nodes = [];
			for (let i = 0, len = node.childNodes.length; i < len; i++) nodes.push(node.childNodes[i]);
			for (let i = 0, len = nodes.length; i < len; i++) parent.insertBefore(nodes[i], node);
		}
		parent.removeChild(node);
	}
	/**
	* @method removeWhile
	*
	* @param {Node} node
	* @param {Function} pred
	*/
	function removeWhile(node, pred) {
		while (node) {
			if (isEditable(node) || !pred(node)) break;
			const parent = node.parentNode;
			remove(node);
			node = parent;
		}
	}
	/**
	* @method replace
	*
	* replace node with provided nodeName
	*
	* @param {Node} node
	* @param {String} nodeName
	* @return {Node} - new node
	*/
	function replace(node, nodeName) {
		if (node.nodeName.toUpperCase() === nodeName.toUpperCase()) return node;
		const newNode = create(nodeName);
		if (node.style.cssText) newNode.style.cssText = node.style.cssText;
		appendChildNodes(newNode, lists_default.from(node.childNodes));
		insertAfter(newNode, node);
		remove(node);
		return newNode;
	}
	var isTextarea = makePredByNodeName("TEXTAREA");
	/**
	* @param {DomQuery|Element} $node
	* @param {Boolean} [stripLinebreaks] - default: false
	*/
	function value($node, stripLinebreaks) {
		const el = $node.get ? $node.get(0) : $node[0];
		const val = isTextarea(el) ? el.value || $node.val() : $node.html();
		if (stripLinebreaks) return val.replace(/[\n\r]/g, "");
		return val;
	}
	/**
	* @method html
	*
	* get the HTML contents of node
	*
	* @param {DomQuery|Element} $node
	* @param {Boolean} [isNewlineOnBlock]
	*/
	function html($node, isNewlineOnBlock) {
		let markup = value($node);
		if (isNewlineOnBlock) {
			markup = markup.replace(/<(\/?)(\b(?!!)[^>\s]*)(.*?)(\s*\/?>)/g, function(match, endSlash, name) {
				name = name.toUpperCase();
				const isEndOfInlineContainer = /^DIV|^TD|^TH|^P|^LI|^H[1-7]/.test(name) && !!endSlash;
				const isBlockNode = /^BLOCKQUOTE|^TABLE|^TBODY|^TR|^HR|^UL|^OL/.test(name);
				return match + (isEndOfInlineContainer || isBlockNode ? "\n" : "");
			});
			markup = markup.trim();
		}
		return markup;
	}
	function posFromPlaceholder(placeholder) {
		const $placeholder = $$(placeholder);
		const pos = $placeholder.offset();
		const height = $placeholder.outerHeight(true);
		return {
			left: pos.left,
			top: pos.top + height
		};
	}
	function attachEvents($node, events) {
		Object.keys(events).forEach(function(key) {
			$node.on(key, events[key]);
		});
	}
	function detachEvents($node, events) {
		Object.keys(events).forEach(function(key) {
			$node.off(key, events[key]);
		});
	}
	/**
	* @method isCustomStyleTag
	*
	* assert if a node contains a "note-styletag" class,
	* which implies that's a custom-made style tag node
	*
	* @param {Node} an HTML DOM node
	*/
	function isCustomStyleTag(node) {
		return node && !isText(node) && lists_default.contains(node.classList, "note-styletag");
	}
	var dom_default = {
		/** @property {String} NBSP_CHAR */
		NBSP_CHAR,
		/** @property {String} ZERO_WIDTH_NBSP_CHAR */
		ZERO_WIDTH_NBSP_CHAR,
		/** @property {String} blank */
		blank: blankHTML,
		/** @property {String} emptyPara */
		emptyPara: `<p>${blankHTML}</p>`,
		makePredByNodeName,
		isEditable,
		isControlSizing,
		isText,
		isElement,
		isVoid,
		isPara,
		isPurePara,
		isHeading,
		isInline,
		isBlock: func_default.not(isInline),
		isBodyInline,
		isBody,
		isParaInline,
		isPre,
		isList,
		isTable,
		isData,
		isCell,
		isBlockquote,
		isBodyContainer,
		isAnchor,
		isDiv: makePredByNodeName("DIV"),
		isLi,
		isBR: makePredByNodeName("BR"),
		isSpan: makePredByNodeName("SPAN"),
		isB: makePredByNodeName("B"),
		isU: makePredByNodeName("U"),
		isS: makePredByNodeName("S"),
		isI: makePredByNodeName("I"),
		isImg,
		isVideo,
		isIframe,
		isVideoMedia: function(node) {
			return !!(node && (isVideo(node) || isIframe(node) && $$(node).hasClass("note-video-clip")));
		},
		isTextarea,
		deepestChildIsEmpty,
		isEmpty,
		isEmptyAnchor: func_default.and(isAnchor, isEmpty),
		isClosestSibling,
		withClosestSiblings,
		nodeLength,
		isLeftEdgePoint,
		isRightEdgePoint,
		isEdgePoint,
		isLeftEdgeOf,
		isRightEdgeOf,
		isLeftEdgePointOf,
		isRightEdgePointOf,
		prevPoint,
		nextPoint,
		nextPointWithEmptyNode,
		isSamePoint,
		isVisiblePoint,
		prevPointUntil,
		nextPointUntil,
		isCharPoint,
		isSpacePoint,
		walkPoint,
		ancestor,
		singleChildAncestor,
		listAncestor,
		lastAncestor,
		listNext,
		listPrev,
		listDescendant,
		commonAncestor,
		wrap,
		insertAfter,
		appendChildNodes,
		position,
		hasChildren,
		makeOffsetPath,
		fromOffsetPath,
		splitTree,
		splitPoint,
		create,
		createText,
		remove,
		removeWhile,
		replace,
		html,
		value,
		posFromPlaceholder,
		attachEvents,
		detachEvents,
		isCustomStyleTag
	};
	//#endregion
	//#region src/js/Context.js
	var Context = class Context {
		/**
		* @param {DomQuery} $note
		* @param {Object} options
		*/
		constructor($note, options) {
			this.$note = $note;
			this.memos = {};
			this.modules = {};
			this.layoutInfo = {};
			this.explicitContainer = options.container || null;
			this.options = $$.extend(true, {}, options);
			this.options.container = this.options.container || false;
			$$.summernote.ui = $$.summernote.ui_template(this.options);
			this.ui = $$.summernote.ui;
			this.initialize();
		}
		/**
		* create layout and initialize modules and other resources
		*/
		initialize() {
			this.layoutInfo = this.ui.createLayout(this.$note);
			this.applyLayoutClassNames();
			this._initialize();
			this.$note.hide();
			return this;
		}
		normalizeClassNames(classNames) {
			return typeof classNames === "string" ? classNames.split(/\s+/).filter(Boolean) : [];
		}
		applyLayoutClassNames() {
			[
				["editorClassName", this.layoutInfo.editor],
				["editingAreaClassName", this.layoutInfo.editingArea],
				["editableClassName", this.layoutInfo.editable],
				["codableClassName", this.layoutInfo.codable],
				["statusbarClassName", this.layoutInfo.statusbar]
			].forEach(([optionName, $node]) => {
				const classNames = this.normalizeClassNames(this.options[optionName]);
				if ($node && $node.length && classNames.length) $node.addClass(classNames.join(" "));
			});
		}
		/**
		* destroy modules and other resources and remove layout
		*/
		destroy() {
			this._destroy();
			this.$note.removeData("summernote");
			this.ui.removeLayout(this.$note, this.layoutInfo);
		}
		recreate(optionsOverrides = {}) {
			const disabled = this.isDisabled();
			const html = this.code();
			const options = $$.extend(true, {}, this.options, optionsOverrides);
			delete options.id;
			options.container = this.explicitContainer;
			this.destroy();
			this.$note.html(html);
			const context = new Context(this.$note, options);
			this.$note.data("summernote", context);
			context.triggerEvent("init", context.layoutInfo);
			if (disabled) context.disable();
			else if (options.focus) context.invoke("editor.focus");
			return context;
		}
		/**
		* destory modules and other resources and initialize it again
		*/
		reset() {
			const disabled = this.isDisabled();
			this.code(dom_default.emptyPara);
			this._destroy();
			this._initialize();
			if (disabled) this.disable();
		}
		_initialize() {
			this.options.id = func_default.uniqueId(Date.now());
			this.options.container = this.options.container || this.layoutInfo.editor;
			const buttons = $$.extend({}, this.options.buttons);
			Object.keys(buttons).forEach((key) => {
				this.memo("button." + key, buttons[key]);
			});
			const modules = $$.extend({}, this.options.modules, $$.summernote.plugins || {});
			const moduleKeys = Object.keys(modules);
			moduleKeys.forEach((key) => {
				this.module(key, modules[key], true);
			});
			moduleKeys.forEach((key) => {
				this.initializeModule(key);
			});
		}
		_destroy() {
			Object.keys(this.modules).reverse().forEach((key) => {
				this.removeModule(key);
			});
			Object.keys(this.memos).forEach((key) => {
				this.removeMemo(key);
			});
			this.triggerEvent("destroy", this);
		}
		code(html) {
			const isActivated = this.invoke("codeview.isActivated");
			if (html === void 0) {
				this.invoke("codeview.sync");
				return isActivated ? this.layoutInfo.codable.val() : this.layoutInfo.editable.html();
			} else {
				if (isActivated) this.invoke("codeview.sync", html);
				else this.layoutInfo.editable.html(html);
				this.$note.val(html);
				this.triggerEvent("change", html, this.layoutInfo.editable);
			}
		}
		isDisabled() {
			return this.layoutInfo.editable.attr("contenteditable") === "false";
		}
		enable() {
			this.layoutInfo.editable.attr("contenteditable", "true");
			this.invoke("toolbar.activate", true);
			this.triggerEvent("disable", false);
			this.options.editing = true;
		}
		disable() {
			if (this.invoke("codeview.isActivated")) this.invoke("codeview.deactivate");
			this.layoutInfo.editable.attr("contenteditable", "false");
			this.options.editing = false;
			this.invoke("toolbar.deactivate", true);
			this.triggerEvent("disable", true);
		}
		triggerEvent() {
			const namespace = lists_default.head(arguments);
			const args = lists_default.tail(lists_default.from(arguments));
			const callback = this.options.callbacks[func_default.namespaceToCamel(namespace, "on")];
			if (callback) callback.apply(this.$note[0], args);
			this.$note.trigger("summernote." + namespace, args);
		}
		initializeModule(key) {
			const module = this.modules[key];
			module.shouldInitialize = module.shouldInitialize || func_default.ok;
			if (!module.shouldInitialize()) return;
			if (module.initialize) module.initialize();
			if (module.events) dom_default.attachEvents(this.$note, module.events);
		}
		module(key, ModuleClass, withoutIntialize) {
			if (arguments.length === 1) return this.modules[key];
			this.modules[key] = new ModuleClass(this);
			this.modules[key].shouldInitialize = this.modules[key].shouldInitialize || func_default.ok;
			if (!withoutIntialize) this.initializeModule(key);
		}
		removeModule(key) {
			const module = this.modules[key];
			if (!module) return;
			if (typeof module.shouldInitialize === "function" ? module.shouldInitialize() : true) {
				if (module.events) dom_default.detachEvents(this.$note, module.events);
				if (module.destroy) module.destroy();
			}
			delete this.modules[key];
		}
		memo(key, obj) {
			if (arguments.length === 1) return this.memos[key];
			this.memos[key] = obj;
		}
		removeMemo(key) {
			if (this.memos[key] && this.memos[key].destroy) this.memos[key].destroy();
			delete this.memos[key];
		}
		/**
		* Some buttons need to change their visual style immediately once they get pressed
		*/
		createInvokeHandlerAndUpdateState(namespace, value) {
			return (event) => {
				this.createInvokeHandler(namespace, value)(event);
				this.invoke("buttons.updateCurrentStyle");
			};
		}
		createInvokeHandler(namespace, value) {
			return (event) => {
				event.preventDefault();
				const $target = $$(event.target);
				this.invoke(namespace, value || $target.closest("[data-value]").data("value"), $target);
			};
		}
		invoke() {
			const namespace = lists_default.head(arguments);
			const args = lists_default.tail(lists_default.from(arguments));
			const splits = namespace.split(".");
			const hasSeparator = splits.length > 1;
			const moduleName = hasSeparator && lists_default.head(splits);
			const methodName = hasSeparator ? lists_default.last(splits) : lists_default.head(splits);
			const module = this.modules[moduleName || "editor"];
			if (!moduleName && this[methodName]) return this[methodName].apply(this, args);
			else if (module && module[methodName] && (typeof module.shouldInitialize !== "function" || module.shouldInitialize())) return module[methodName].apply(module, args);
		}
	};
	//#endregion
	//#region src/js/summernote.js
	function resolveCollection(target) {
		const collection = target instanceof Context ? target.$note : $$(target);
		if (!collection.length) throw new Error("Summernote target not found.");
		return collection;
	}
	function getContexts(target, requireInitialized = true) {
		const contexts = resolveCollection(target).map((idx, note) => $$(note).data("summernote"));
		if (requireInitialized && contexts.some((context) => !context)) throw new Error("Summernote is not initialized on the target.");
		return contexts;
	}
	function unwrapResult(results) {
		return results.length === 1 ? results[0] : results;
	}
	/**
	* Summernote API
	*
	* @param {Object|String}
	* @return {this}
	*/
	DomQuery.prototype.summernote = function() {
		const type = typeof lists_default.head(arguments);
		const isExternalAPICalled = type === "string";
		const initOptions = type === "object" ? lists_default.head(arguments) : {};
		const options = $$.extend({}, $$.summernote.options, initOptions);
		options.langInfo = $$.extend(true, {}, $$.summernote.lang["en-US"], $$.summernote.lang[options.lang]);
		if (!Object.prototype.hasOwnProperty.call(initOptions, "colorsName") && options.langInfo.color?.colorsName) options.colorsName = options.langInfo.color.colorsName;
		options.icons = $$.extend(true, {}, $$.summernote.options.icons, options.icons);
		options.tooltip = options.tooltip === "auto" ? !env_default.isSupportTouch : options.tooltip;
		this.each((idx, note) => {
			const $note = $$(note);
			if (!$note.data("summernote")) {
				const context = new Context($note, options);
				$note.data("summernote", context);
				$note.data("summernote").triggerEvent("init", context.layoutInfo);
			}
		});
		const $note = this.first();
		if ($note.length) {
			const context = $note.data("summernote");
			if (isExternalAPICalled) return context.invoke.apply(context, lists_default.from(arguments));
			else if (options.focus) context.invoke("editor.focus");
		}
		return this;
	};
	Object.assign($$, {
		create(target, options = {}) {
			const collection = resolveCollection(target);
			collection.summernote(options);
			return unwrapResult(getContexts(collection));
		},
		getInstance(target) {
			return unwrapResult(getContexts(target));
		},
		destroy(target) {
			getContexts(target).forEach((context) => context.destroy());
		},
		invoke(target, method, ...args) {
			return unwrapResult(getContexts(target).map((context) => context.invoke(method, ...args)));
		}
	});
	//#endregion
	//#region src/js/core/range.js
	/**
	* return boundaryPoint from TextRange, inspired by Andy Na's HuskyRange.js
	*
	* @param {TextRange} textRange
	* @param {Boolean} isStart
	* @return {BoundaryPoint}
	*
	* @see http://msdn.microsoft.com/en-us/library/ie/ms535872(v=vs.85).aspx
	*/
	function textRangeToPoint(textRange, isStart) {
		let container = textRange.parentElement();
		let offset;
		const tester = document.body.createTextRange();
		let prevContainer;
		const childNodes = lists_default.from(container.childNodes);
		for (offset = 0; offset < childNodes.length; offset++) {
			if (dom_default.isText(childNodes[offset])) continue;
			tester.moveToElementText(childNodes[offset]);
			if (tester.compareEndPoints("StartToStart", textRange) >= 0) break;
			prevContainer = childNodes[offset];
		}
		if (offset !== 0 && dom_default.isText(childNodes[offset - 1])) {
			const textRangeStart = document.body.createTextRange();
			textRangeStart.moveToElementText(prevContainer || container);
			textRangeStart.collapse(!prevContainer);
			let curTextNode = prevContainer ? prevContainer.nextSibling : container.firstChild;
			const pointTester = textRange.duplicate();
			pointTester.setEndPoint("StartToStart", textRangeStart);
			let textCount = pointTester.text.replace(/[\r\n]/g, "").length;
			while (textCount > curTextNode.nodeValue.length && curTextNode.nextSibling) {
				textCount -= curTextNode.nodeValue.length;
				curTextNode = curTextNode.nextSibling;
			}
			curTextNode.nodeValue;
			if (isStart && curTextNode.nextSibling && dom_default.isText(curTextNode.nextSibling) && textCount === curTextNode.nodeValue.length) {
				textCount -= curTextNode.nodeValue.length;
				curTextNode = curTextNode.nextSibling;
			}
			container = curTextNode;
			offset = textCount;
		}
		return {
			cont: container,
			offset
		};
	}
	/**
	* return TextRange from boundary point (inspired by google closure-library)
	* @param {BoundaryPoint} point
	* @return {TextRange}
	*/
	function pointToTextRange(point) {
		const textRangeInfo = function(container, offset) {
			let node, isCollapseToStart;
			if (dom_default.isText(container)) {
				const prevTextNodes = dom_default.listPrev(container, func_default.not(dom_default.isText));
				const prevContainer = lists_default.last(prevTextNodes).previousSibling;
				node = prevContainer || container.parentNode;
				offset += lists_default.sum(lists_default.tail(prevTextNodes), dom_default.nodeLength);
				isCollapseToStart = !prevContainer;
			} else {
				node = container.childNodes[offset] || container;
				if (dom_default.isText(node)) return textRangeInfo(node, 0);
				offset = 0;
				isCollapseToStart = false;
			}
			return {
				node,
				collapseToStart: isCollapseToStart,
				offset
			};
		};
		const textRange = document.body.createTextRange();
		const info = textRangeInfo(point.node, point.offset);
		textRange.moveToElementText(info.node);
		textRange.collapse(info.collapseToStart);
		textRange.moveStart("character", info.offset);
		return textRange;
	}
	/**
	* Wrapped Range
	*
	* @constructor
	* @param {Node} sc - start container
	* @param {Number} so - start offset
	* @param {Node} ec - end container
	* @param {Number} eo - end offset
	*/
	var WrappedRange = class WrappedRange {
		constructor(sc, so, ec, eo) {
			this.sc = sc;
			this.so = so;
			this.ec = ec;
			this.eo = eo;
			this.isOnEditable = this.makeIsOn(dom_default.isEditable);
			this.isOnList = this.makeIsOn(dom_default.isList);
			this.isOnAnchor = this.makeIsOn(dom_default.isAnchor);
			this.isOnCell = this.makeIsOn(dom_default.isCell);
			this.isOnData = this.makeIsOn(dom_default.isData);
		}
		nativeRange() {
			if (env_default.isW3CRangeSupport) {
				const w3cRange = document.createRange();
				w3cRange.setStart(this.sc, this.so);
				w3cRange.setEnd(this.ec, this.ec.data ? Math.min(this.eo, this.ec.data.length) : this.eo);
				return w3cRange;
			} else {
				const textRange = pointToTextRange({
					node: this.sc,
					offset: this.so
				});
				textRange.setEndPoint("EndToEnd", pointToTextRange({
					node: this.ec,
					offset: this.eo
				}));
				return textRange;
			}
		}
		getPoints() {
			return {
				sc: this.sc,
				so: this.so,
				ec: this.ec,
				eo: this.eo
			};
		}
		getStartPoint() {
			return {
				node: this.sc,
				offset: this.so
			};
		}
		getEndPoint() {
			return {
				node: this.ec,
				offset: this.eo
			};
		}
		/**
		* select update visible range
		*/
		select() {
			const nativeRng = this.nativeRange();
			if (env_default.isW3CRangeSupport) {
				const selection = document.getSelection();
				if (selection.rangeCount > 0) selection.removeAllRanges();
				selection.addRange(nativeRng);
			} else nativeRng.select();
			return this;
		}
		/**
		* Moves the scrollbar to start container(sc) of current range
		*
		* @return {WrappedRange}
		*/
		scrollIntoView(container) {
			const height = $$(container).height();
			if (container.scrollTop + height < this.sc.offsetTop) container.scrollTop += Math.abs(container.scrollTop + height - this.sc.offsetTop);
			return this;
		}
		/**
		* @return {WrappedRange}
		*/
		normalize() {
			/**
			* @param {BoundaryPoint} point
			* @param {Boolean} isLeftToRight - true: prefer to choose right node
			*                                - false: prefer to choose left node
			* @return {BoundaryPoint}
			*/
			const getVisiblePoint = function(point, isLeftToRight) {
				if (dom_default.isVisiblePoint(point)) {
					if (!dom_default.isEdgePoint(point) || dom_default.isRightEdgePoint(point) && !isLeftToRight || dom_default.isLeftEdgePoint(point) && isLeftToRight || dom_default.isRightEdgePoint(point) && isLeftToRight && dom_default.isVoid(point.node.nextSibling) || dom_default.isLeftEdgePoint(point) && !isLeftToRight && dom_default.isVoid(point.node.previousSibling) || dom_default.isBlock(point.node) && dom_default.isEmpty(point.node)) return point;
				}
				const block = dom_default.ancestor(point.node, dom_default.isBlock);
				const prevPoint = dom_default.prevPoint(point) || { node: null };
				const hasRightNode = (dom_default.isLeftEdgePointOf(point, block) || dom_default.isVoid(prevPoint.node)) && !isLeftToRight;
				const immediateNextPoint = dom_default.nextPoint(point) || { node: null };
				const hasLeftNode = (dom_default.isRightEdgePointOf(point, block) || dom_default.isVoid(immediateNextPoint.node)) && isLeftToRight;
				if (hasRightNode || hasLeftNode) {
					if (dom_default.isVisiblePoint(point)) return point;
					isLeftToRight = !isLeftToRight;
				}
				return (isLeftToRight ? dom_default.nextPointUntil(dom_default.nextPoint(point), dom_default.isVisiblePoint) : dom_default.prevPointUntil(dom_default.prevPoint(point), dom_default.isVisiblePoint)) || point;
			};
			const endPoint = getVisiblePoint(this.getEndPoint(), false);
			const startPoint = this.isCollapsed() ? endPoint : getVisiblePoint(this.getStartPoint(), true);
			return new WrappedRange(startPoint.node, startPoint.offset, endPoint.node, endPoint.offset);
		}
		/**
		* returns matched nodes on range
		*
		* @param {Function} [pred] - predicate function
		* @param {Object} [options]
		* @param {Boolean} [options.includeAncestor]
		* @param {Boolean} [options.fullyContains]
		* @return {Node[]}
		*/
		nodes(pred, options) {
			pred = pred || func_default.ok;
			const includeAncestor = options && options.includeAncestor;
			const fullyContains = options && options.fullyContains;
			const startPoint = this.getStartPoint();
			const endPoint = this.getEndPoint();
			const nodes = [];
			const leftEdgeNodes = [];
			dom_default.walkPoint(startPoint, endPoint, function(point) {
				if (dom_default.isEditable(point.node)) return;
				let node;
				if (fullyContains) {
					if (dom_default.isLeftEdgePoint(point)) leftEdgeNodes.push(point.node);
					if (dom_default.isRightEdgePoint(point) && lists_default.contains(leftEdgeNodes, point.node)) node = point.node;
				} else if (includeAncestor) node = dom_default.ancestor(point.node, pred);
				else node = point.node;
				if (node && pred(node)) nodes.push(node);
			}, true);
			return lists_default.unique(nodes);
		}
		/**
		* returns commonAncestor of range
		* @return {Element} - commonAncestor
		*/
		commonAncestor() {
			return dom_default.commonAncestor(this.sc, this.ec);
		}
		/**
		* returns expanded range by pred
		*
		* @param {Function} pred - predicate function
		* @return {WrappedRange}
		*/
		expand(pred) {
			const startAncestor = dom_default.ancestor(this.sc, pred);
			const endAncestor = dom_default.ancestor(this.ec, pred);
			if (!startAncestor && !endAncestor) return new WrappedRange(this.sc, this.so, this.ec, this.eo);
			const boundaryPoints = this.getPoints();
			if (startAncestor) {
				boundaryPoints.sc = startAncestor;
				boundaryPoints.so = 0;
			}
			if (endAncestor) {
				boundaryPoints.ec = endAncestor;
				boundaryPoints.eo = dom_default.nodeLength(endAncestor);
			}
			return new WrappedRange(boundaryPoints.sc, boundaryPoints.so, boundaryPoints.ec, boundaryPoints.eo);
		}
		/**
		* @param {Boolean} isCollapseToStart
		* @return {WrappedRange}
		*/
		collapse(isCollapseToStart) {
			if (isCollapseToStart) return new WrappedRange(this.sc, this.so, this.sc, this.so);
			else return new WrappedRange(this.ec, this.eo, this.ec, this.eo);
		}
		/**
		* splitText on range
		*/
		splitText() {
			const isSameContainer = this.sc === this.ec;
			const boundaryPoints = this.getPoints();
			if (dom_default.isText(this.ec) && !dom_default.isEdgePoint(this.getEndPoint())) this.ec.splitText(this.eo);
			if (dom_default.isText(this.sc) && !dom_default.isEdgePoint(this.getStartPoint())) {
				boundaryPoints.sc = this.sc.splitText(this.so);
				boundaryPoints.so = 0;
				if (isSameContainer) {
					boundaryPoints.ec = boundaryPoints.sc;
					boundaryPoints.eo = this.eo - this.so;
				}
			}
			return new WrappedRange(boundaryPoints.sc, boundaryPoints.so, boundaryPoints.ec, boundaryPoints.eo);
		}
		/**
		* delete contents on range
		* @return {WrappedRange}
		*/
		deleteContents() {
			if (this.isCollapsed()) return this;
			const rng = this.splitText();
			const nodes = rng.nodes(null, { fullyContains: true });
			const point = dom_default.prevPointUntil(rng.getStartPoint(), function(point) {
				return !lists_default.contains(nodes, point.node);
			});
			const emptyParents = [];
			nodes.forEach(function(node) {
				const parent = node.parentNode;
				if (point.node !== parent && dom_default.nodeLength(parent) === 1) emptyParents.push(parent);
				dom_default.remove(node, false);
			});
			emptyParents.forEach(function(node) {
				dom_default.remove(node, false);
			});
			return new WrappedRange(point.node, point.offset, point.node, point.offset).normalize();
		}
		/**
		* makeIsOn: return isOn(pred) function
		*/
		makeIsOn(pred) {
			return function() {
				const ancestor = dom_default.ancestor(this.sc, pred);
				return !!ancestor && ancestor === dom_default.ancestor(this.ec, pred);
			};
		}
		/**
		* @param {Function} pred
		* @return {Boolean}
		*/
		isLeftEdgeOf(pred) {
			if (!dom_default.isLeftEdgePoint(this.getStartPoint())) return false;
			const node = dom_default.ancestor(this.sc, pred);
			return node && dom_default.isLeftEdgeOf(this.sc, node);
		}
		/**
		* returns whether range was collapsed or not
		*/
		isCollapsed() {
			return this.sc === this.ec && this.so === this.eo;
		}
		/**
		* wrap inline nodes which children of body with paragraph
		*
		* @return {WrappedRange}
		*/
		wrapBodyInlineWithPara() {
			if (dom_default.isBodyContainer(this.sc) && dom_default.isEmpty(this.sc)) {
				this.sc.innerHTML = dom_default.emptyPara;
				return new WrappedRange(this.sc.firstChild, 0, this.sc.firstChild, 0);
			}
			/**
			* [workaround] firefox often create range on not visible point. so normalize here.
			*  - firefox: |<p>text</p>|
			*  - chrome: <p>|text|</p>
			*/
			const rng = this.normalize();
			if (dom_default.isParaInline(this.sc) || dom_default.isPara(this.sc)) return rng;
			let topAncestor;
			if (dom_default.isInline(rng.sc)) {
				const ancestors = dom_default.listAncestor(rng.sc, func_default.not(dom_default.isInline));
				topAncestor = lists_default.last(ancestors);
				if (!dom_default.isInline(topAncestor)) topAncestor = ancestors[ancestors.length - 2];
			} else topAncestor = rng.sc.childNodes[rng.so > 0 ? rng.so - 1 : 0];
			if (topAncestor) {
				let inlineSiblings = dom_default.listPrev(topAncestor, dom_default.isParaInline).reverse();
				inlineSiblings = inlineSiblings.concat(dom_default.listNext(topAncestor.nextSibling, dom_default.isParaInline));
				if (inlineSiblings.length) {
					const para = dom_default.wrap(lists_default.head(inlineSiblings), "p");
					dom_default.appendChildNodes(para, lists_default.tail(inlineSiblings));
				}
			}
			return this.normalize();
		}
		/**
		* insert node at current cursor
		*
		* @param {Node} node
		* @param {Boolean} doNotInsertPara - default is false, removes added <p> that's added if true
		* @return {Node}
		*/
		insertNode(node, doNotInsertPara = false) {
			let rng = this;
			if (dom_default.isText(node) || dom_default.isInline(node)) rng = this.wrapBodyInlineWithPara().deleteContents();
			const info = dom_default.splitPoint(rng.getStartPoint(), dom_default.isInline(node));
			if (info.rightNode) {
				info.rightNode.parentNode.insertBefore(node, info.rightNode);
				if (dom_default.isEmpty(info.rightNode) && (doNotInsertPara || dom_default.isPara(node))) info.rightNode.parentNode.removeChild(info.rightNode);
			} else info.container.appendChild(node);
			return node;
		}
		/**
		* insert html at current cursor
		*/
		pasteHTML(markup) {
			markup = ((markup || "") + "").trim();
			const contentsContainer = document.createElement("div");
			contentsContainer.innerHTML = markup;
			let childNodes = lists_default.from(contentsContainer.childNodes).reverse();
			const rng = this;
			childNodes = childNodes.map(function(childNode) {
				return rng.insertNode(childNode, !dom_default.isInline(childNode));
			});
			return childNodes.reverse();
		}
		/**
		* returns text in range
		*
		* @return {String}
		*/
		toString() {
			const nativeRng = this.nativeRange();
			return env_default.isW3CRangeSupport ? nativeRng.toString() : nativeRng.text;
		}
		/**
		* returns range for word before cursor
		*
		* @param {Boolean} [findAfter] - find after cursor, default: false
		* @return {WrappedRange}
		*/
		getWordRange(findAfter) {
			let endPoint = this.getEndPoint();
			if (!dom_default.isCharPoint(endPoint)) return this;
			const startPoint = dom_default.prevPointUntil(endPoint, function(point) {
				return !dom_default.isCharPoint(point);
			});
			if (findAfter) endPoint = dom_default.nextPointUntil(endPoint, function(point) {
				return !dom_default.isCharPoint(point);
			});
			return new WrappedRange(startPoint.node, startPoint.offset, endPoint.node, endPoint.offset);
		}
		/**
		* returns range for words before cursor
		*
		* @param {Boolean} [findAfter] - find after cursor, default: false
		* @return {WrappedRange}
		*/
		getWordsRange(findAfter) {
			var endPoint = this.getEndPoint();
			var isNotTextPoint = function(point) {
				return !dom_default.isCharPoint(point) && !dom_default.isSpacePoint(point);
			};
			if (isNotTextPoint(endPoint)) return this;
			var startPoint = dom_default.prevPointUntil(endPoint, isNotTextPoint);
			if (findAfter) endPoint = dom_default.nextPointUntil(endPoint, isNotTextPoint);
			return new WrappedRange(startPoint.node, startPoint.offset, endPoint.node, endPoint.offset);
		}
		/**
		* returns range for words before cursor that match with a Regex
		*
		* example:
		*  range: 'hi @Peter Pan'
		*  regex: '/@[a-z ]+/i'
		*  return range: '@Peter Pan'
		*
		* @param {RegExp} [regex]
		* @return {WrappedRange|null}
		*/
		getWordsMatchRange(regex) {
			var endPoint = this.getEndPoint();
			var startPoint = dom_default.prevPointUntil(endPoint, function(point) {
				if (!dom_default.isCharPoint(point) && !dom_default.isSpacePoint(point)) return true;
				var rng = new WrappedRange(point.node, point.offset, endPoint.node, endPoint.offset);
				var result = regex.exec(rng.toString());
				return result && result.index === 0;
			});
			var rng = new WrappedRange(startPoint.node, startPoint.offset, endPoint.node, endPoint.offset);
			var text = rng.toString();
			var result = regex.exec(text);
			if (result && result[0].length === text.length) return rng;
			else return null;
		}
		/**
		* create offsetPath bookmark
		*
		* @param {Node} editable
		*/
		bookmark(editable) {
			return {
				s: {
					path: dom_default.makeOffsetPath(editable, this.sc),
					offset: this.so
				},
				e: {
					path: dom_default.makeOffsetPath(editable, this.ec),
					offset: this.eo
				}
			};
		}
		/**
		* create offsetPath bookmark base on paragraph
		*
		* @param {Node[]} paras
		*/
		paraBookmark(paras) {
			return {
				s: {
					path: lists_default.tail(dom_default.makeOffsetPath(lists_default.head(paras), this.sc)),
					offset: this.so
				},
				e: {
					path: lists_default.tail(dom_default.makeOffsetPath(lists_default.last(paras), this.ec)),
					offset: this.eo
				}
			};
		}
		/**
		* getClientRects
		* @return {Rect[]}
		*/
		getClientRects() {
			return this.nativeRange().getClientRects();
		}
	};
	/**
	* Data structure
	*  * BoundaryPoint: a point of dom tree
	*  * BoundaryPoints: two boundaryPoints corresponding to the start and the end of the Range
	*
	* See to http://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html#Level-2-Range-Position
	*/
	var range_default = {
		/**
		* create Range Object From arguments or Browser Selection
		*
		* @param {Node} sc - start container
		* @param {Number} so - start offset
		* @param {Node} ec - end container
		* @param {Number} eo - end offset
		* @return {WrappedRange}
		*/
		create: function(sc, so, ec, eo) {
			if (arguments.length === 4) return new WrappedRange(sc, so, ec, eo);
			else if (arguments.length === 2) {
				ec = sc;
				eo = so;
				return new WrappedRange(sc, so, ec, eo);
			} else {
				let wrappedRange = this.createFromSelection();
				if (!wrappedRange && arguments.length === 1) {
					let bodyElement = arguments[0];
					if (dom_default.isEditable(bodyElement)) bodyElement = bodyElement.lastChild;
					return this.createFromBodyElement(bodyElement, dom_default.emptyPara === arguments[0].innerHTML);
				}
				return wrappedRange;
			}
		},
		createFromBodyElement: function(bodyElement, isCollapseToStart = false) {
			return this.createFromNode(bodyElement).collapse(isCollapseToStart);
		},
		createFromSelection: function() {
			let sc, so, ec, eo;
			if (env_default.isW3CRangeSupport) {
				const selection = document.getSelection();
				if (!selection || selection.rangeCount === 0) return null;
				else if (dom_default.isBody(selection.anchorNode)) return null;
				const nativeRng = selection.getRangeAt(0);
				sc = nativeRng.startContainer;
				so = nativeRng.startOffset;
				ec = nativeRng.endContainer;
				eo = nativeRng.endOffset;
			} else {
				const textRange = document.selection.createRange();
				const textRangeEnd = textRange.duplicate();
				textRangeEnd.collapse(false);
				const textRangeStart = textRange;
				textRangeStart.collapse(true);
				let startPoint = textRangeToPoint(textRangeStart, true);
				let endPoint = textRangeToPoint(textRangeEnd, false);
				if (dom_default.isText(startPoint.cont) && dom_default.isLeftEdgePoint({
					node: startPoint.cont,
					offset: startPoint.offset
				}) && dom_default.isText(endPoint.cont) && dom_default.isRightEdgePoint({
					node: endPoint.cont,
					offset: endPoint.offset
				}) && endPoint.cont.nextSibling === startPoint.cont) startPoint = endPoint;
				sc = startPoint.cont;
				so = startPoint.offset;
				ec = endPoint.cont;
				eo = endPoint.offset;
			}
			return new WrappedRange(sc, so, ec, eo);
		},
		/**
		* @method
		*
		* create WrappedRange from node
		*
		* @param {Node} node
		* @return {WrappedRange}
		*/
		createFromNode: function(node) {
			let sc = node;
			let so = 0;
			let ec = node;
			let eo = dom_default.nodeLength(ec);
			if (dom_default.isVoid(sc)) {
				so = dom_default.listPrev(sc).length - 1;
				sc = sc.parentNode;
			}
			if (dom_default.isBR(ec)) {
				eo = dom_default.listPrev(ec).length - 1;
				ec = ec.parentNode;
			} else if (dom_default.isVoid(ec)) {
				eo = dom_default.listPrev(ec).length;
				ec = ec.parentNode;
			}
			return this.create(sc, so, ec, eo);
		},
		/**
		* create WrappedRange from node after position
		*
		* @param {Node} node
		* @return {WrappedRange}
		*/
		createFromNodeBefore: function(node) {
			return this.createFromNode(node).collapse(true);
		},
		/**
		* create WrappedRange from node after position
		*
		* @param {Node} node
		* @return {WrappedRange}
		*/
		createFromNodeAfter: function(node) {
			return this.createFromNode(node).collapse();
		},
		/**
		* @method
		*
		* create WrappedRange from bookmark
		*
		* @param {Node} editable
		* @param {Object} bookmark
		* @return {WrappedRange}
		*/
		createFromBookmark: function(editable, bookmark) {
			const sc = dom_default.fromOffsetPath(editable, bookmark.s.path);
			const so = bookmark.s.offset;
			const ec = dom_default.fromOffsetPath(editable, bookmark.e.path);
			const eo = bookmark.e.offset;
			return new WrappedRange(sc, so, ec, eo);
		},
		/**
		* @method
		*
		* create WrappedRange from paraBookmark
		*
		* @param {Object} bookmark
		* @param {Node[]} paras
		* @return {WrappedRange}
		*/
		createFromParaBookmark: function(bookmark, paras) {
			const so = bookmark.s.offset;
			const eo = bookmark.e.offset;
			return new WrappedRange(dom_default.fromOffsetPath(lists_default.head(paras), bookmark.s.path), so, dom_default.fromOffsetPath(lists_default.last(paras), bookmark.e.path), eo);
		}
	};
	//#endregion
	//#region src/js/core/key.js
	var KEY_MAP = {
		"BACKSPACE": 8,
		"TAB": 9,
		"ENTER": 13,
		"ESCAPE": 27,
		"SPACE": 32,
		"DELETE": 46,
		"LEFT": 37,
		"UP": 38,
		"RIGHT": 39,
		"DOWN": 40,
		"NUM0": 48,
		"NUM1": 49,
		"NUM2": 50,
		"NUM3": 51,
		"NUM4": 52,
		"NUM5": 53,
		"NUM6": 54,
		"NUM7": 55,
		"NUM8": 56,
		"B": 66,
		"E": 69,
		"I": 73,
		"J": 74,
		"K": 75,
		"L": 76,
		"R": 82,
		"S": 83,
		"U": 85,
		"V": 86,
		"Y": 89,
		"Z": 90,
		"SLASH": 191,
		"LEFTBRACKET": 219,
		"BACKSLASH": 220,
		"RIGHTBRACKET": 221,
		"HOME": 36,
		"END": 35,
		"PAGEUP": 33,
		"PAGEDOWN": 34
	};
	/**
	* @class core.key
	*
	* Object for keycodes.
	*
	* @singleton
	* @alternateClassName key
	*/
	var key_default = {
		/**
		* @method isEdit
		*
		* @param {Number} keyCode
		* @return {Boolean}
		*/
		isEdit: (keyCode) => {
			return lists_default.contains([
				KEY_MAP.BACKSPACE,
				KEY_MAP.TAB,
				KEY_MAP.ENTER,
				KEY_MAP.SPACE,
				KEY_MAP.DELETE
			], keyCode);
		},
		/**
		* @method isRemove
		*
		* @param {Number} keyCode
		* @return {Boolean}
		*/
		isRemove: (keyCode) => {
			return lists_default.contains([KEY_MAP.BACKSPACE, KEY_MAP.DELETE], keyCode);
		},
		/**
		* @method isMove
		*
		* @param {Number} keyCode
		* @return {Boolean}
		*/
		isMove: (keyCode) => {
			return lists_default.contains([
				KEY_MAP.LEFT,
				KEY_MAP.UP,
				KEY_MAP.RIGHT,
				KEY_MAP.DOWN
			], keyCode);
		},
		/**
		* @method isNavigation
		*
		* @param {Number} keyCode
		* @return {Boolean}
		*/
		isNavigation: (keyCode) => {
			return lists_default.contains([
				KEY_MAP.HOME,
				KEY_MAP.END,
				KEY_MAP.PAGEUP,
				KEY_MAP.PAGEDOWN
			], keyCode);
		},
		/**
		* @property {Object} nameFromCode
		* @property {String} nameFromCode.8 "BACKSPACE"
		*/
		nameFromCode: func_default.invertObject(KEY_MAP),
		code: KEY_MAP
	};
	//#endregion
	//#region src/js/core/async.js
	/**
	* @method readFileAsDataURL
	*
	* read contents of file as representing URL
	*
	* @param {File} file
	* @return {Promise} - then: dataUrl
	*/
	function readFileAsDataURL(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (event) => {
				const dataURL = event.target.result;
				resolve(dataURL);
			};
			reader.onerror = (err) => {
				reject(err);
			};
			reader.readAsDataURL(file);
		});
	}
	/**
	* @method createImage
	*
	* create `<image>` from url string
	*
	* @param {String} url
	* @return {Promise} - then: $image
	*/
	function createImage(url) {
		return new Promise((resolve, reject) => {
			const img = document.createElement("img");
			const cleanup = () => {
				img.removeEventListener("load", onLoad);
				img.removeEventListener("error", onError);
				img.removeEventListener("abort", onError);
			};
			const onLoad = () => {
				cleanup();
				resolve($$(img));
			};
			const onError = () => {
				cleanup();
				if (img.parentNode) img.parentNode.removeChild(img);
				reject($$(img));
			};
			img.addEventListener("load", onLoad);
			img.addEventListener("error", onError);
			img.addEventListener("abort", onError);
			img.style.display = "none";
			img.src = url;
		});
	}
	//#endregion
	//#region src/js/editing/History.js
	var History = class {
		constructor(context) {
			this.stack = [];
			this.stackOffset = -1;
			this.context = context;
			this.$editable = context.layoutInfo.editable;
			this.editable = this.$editable.get(0);
		}
		makeSnapshot() {
			const rng = range_default.create(this.editable);
			return {
				contents: this.$editable.html(),
				bookmark: rng && rng.isOnEditable() ? rng.bookmark(this.editable) : {
					s: {
						path: [],
						offset: 0
					},
					e: {
						path: [],
						offset: 0
					}
				}
			};
		}
		applySnapshot(snapshot) {
			if (snapshot.contents !== null) this.$editable.html(snapshot.contents);
			if (snapshot.bookmark !== null) range_default.createFromBookmark(this.editable, snapshot.bookmark).select();
		}
		/**
		* @method rewind
		* Rewinds the history stack back to the first snapshot taken.
		* Leaves the stack intact, so that "Redo" can still be used.
		*/
		rewind() {
			if (this.$editable.html() !== this.stack[this.stackOffset].contents) this.recordUndo();
			this.stackOffset = 0;
			this.applySnapshot(this.stack[this.stackOffset]);
		}
		/**
		*  @method commit
		*  Resets history stack, but keeps current editor's content.
		*/
		commit() {
			this.stack = [];
			this.stackOffset = -1;
			this.recordUndo();
		}
		/**
		* @method reset
		* Resets the history stack completely; reverting to an empty editor.
		*/
		reset() {
			this.stack = [];
			this.stackOffset = -1;
			this.$editable.html("");
			this.recordUndo();
		}
		/**
		* undo
		*/
		undo() {
			if (this.$editable.html() !== this.stack[this.stackOffset].contents) this.recordUndo();
			if (this.stackOffset > 0) {
				this.stackOffset--;
				this.applySnapshot(this.stack[this.stackOffset]);
			}
		}
		/**
		* redo
		*/
		redo() {
			if (this.stack.length - 1 > this.stackOffset) {
				this.stackOffset++;
				this.applySnapshot(this.stack[this.stackOffset]);
			}
		}
		/**
		* recorded undo
		*/
		recordUndo() {
			this.stackOffset++;
			if (this.stack.length > this.stackOffset) this.stack = this.stack.slice(0, this.stackOffset);
			this.stack.push(this.makeSnapshot());
			if (this.stack.length > this.context.options.historyLimit) {
				this.stack.shift();
				this.stackOffset -= 1;
			}
		}
	};
	//#endregion
	//#region src/js/editing/Style.js
	var Style = class {
		/**
		* Collect CSS property values from a node using native computed styles.
		* Inline styles still win when the browser reports them directly.
		*
		* @private
		* @param  {DomQuery|Element} node
		* @param  {Array} propertyNames - An array of one or more CSS properties.
		* @return {Object}
		*/
		readStyleProperties(node, propertyNames) {
			const target = node instanceof Element ? node : $$(node).get(0);
			const result = {};
			if (!target) return result;
			const computedStyle = getComputedStyle(target);
			propertyNames.forEach((propertyName) => {
				result[propertyName] = target.style.getPropertyValue(propertyName) || computedStyle.getPropertyValue(propertyName);
			});
			return result;
		}
		/**
		* returns style object from node
		*
		* @param {DomQuery|Element} $node
		* @return {Object}
		*/
		fromNode($node) {
			const node = $node instanceof Element ? $node : $$($node).get(0);
			const styleInfo = this.readStyleProperties(node, [
				"font-family",
				"font-size",
				"text-align",
				"list-style-type",
				"line-height"
			]);
			const fontSize = node?.style.fontSize || styleInfo["font-size"] || "";
			styleInfo["font-size"] = parseInt(fontSize, 10);
			styleInfo["font-size-unit"] = fontSize.match(/[a-z%]+$/);
			return styleInfo;
		}
		/**
		* paragraph level style
		*
		* @param {WrappedRange} rng
		* @param {Object} styleInfo
		*/
		stylePara(rng, styleInfo) {
			$$.each(rng.nodes(dom_default.isPara, { includeAncestor: true }), (idx, para) => {
				$$(para).css(styleInfo);
			});
		}
		/**
		* insert and returns styleNodes on range.
		*
		* @param {WrappedRange} rng
		* @param {Object} [options] - options for styleNodes
		* @param {String} [options.nodeName] - default: `SPAN`
		* @param {Boolean} [options.expandClosestSibling] - default: `false`
		* @param {Boolean} [options.onlyPartialContains] - default: `false`
		* @return {Node[]}
		*/
		styleNodes(rng, options) {
			rng = rng.splitText();
			const nodeName = options && options.nodeName || "SPAN";
			const expandClosestSibling = !!(options && options.expandClosestSibling);
			const onlyPartialContains = !!(options && options.onlyPartialContains);
			if (rng.isCollapsed()) return [rng.insertNode(dom_default.create(nodeName))];
			let pred = dom_default.makePredByNodeName(nodeName);
			const nodes = rng.nodes(dom_default.isText, { fullyContains: true }).map((text) => {
				return dom_default.singleChildAncestor(text, pred) || dom_default.wrap(text, nodeName);
			});
			if (expandClosestSibling) {
				if (onlyPartialContains) {
					const nodesInRange = rng.nodes();
					pred = func_default.and(pred, (node) => {
						return lists_default.contains(nodesInRange, node);
					});
				}
				return nodes.map((node) => {
					const siblings = dom_default.withClosestSiblings(node, pred);
					const head = lists_default.head(siblings);
					const tails = lists_default.tail(siblings);
					$$.each(tails, (idx, elem) => {
						dom_default.appendChildNodes(head, elem.childNodes);
						dom_default.remove(elem);
					});
					return lists_default.head(siblings);
				});
			} else return nodes;
		}
		/**
		* get current style on cursor
		*
		* @param {WrappedRange} rng
		* @return {Object} - object contains style properties.
		*/
		current(rng) {
			const $cont = $$(!dom_default.isElement(rng.sc) ? rng.sc.parentNode : rng.sc);
			let styleInfo = this.fromNode($cont);
			try {
				styleInfo = $$.extend(styleInfo, {
					"font-bold": document.queryCommandState("bold") ? "bold" : "normal",
					"font-italic": document.queryCommandState("italic") ? "italic" : "normal",
					"font-underline": document.queryCommandState("underline") ? "underline" : "normal",
					"font-subscript": document.queryCommandState("subscript") ? "subscript" : "normal",
					"font-superscript": document.queryCommandState("superscript") ? "superscript" : "normal",
					"font-strikethrough": document.queryCommandState("strikethrough") ? "strikethrough" : "normal",
					"font-family": document.queryCommandValue("fontname") || styleInfo["font-family"]
				});
			} catch {}
			if (!rng.isOnList()) styleInfo["list-style"] = "none";
			else {
				const isUnordered = [
					"circle",
					"disc",
					"disc-leading-zero",
					"square"
				].indexOf(styleInfo["list-style-type"]) > -1;
				styleInfo["list-style"] = isUnordered ? "unordered" : "ordered";
			}
			const para = dom_default.ancestor(rng.sc, dom_default.isPara);
			if (para && para.style.lineHeight) styleInfo["line-height"] = para.style.lineHeight;
			else if (styleInfo["line-height"] && styleInfo["line-height"] !== "normal") {
				const numValue = parseFloat(styleInfo["line-height"]);
				if (!Number.isNaN(numValue) && styleInfo["font-size"]) {
					const fontSize = parseInt(styleInfo["font-size"], 10);
					if (fontSize > 0) styleInfo["line-height"] = (numValue / fontSize).toFixed(1);
				}
			}
			styleInfo.anchor = rng.isOnAnchor() && dom_default.ancestor(rng.sc, dom_default.isAnchor);
			styleInfo.ancestors = dom_default.listAncestor(rng.sc, dom_default.isEditable);
			styleInfo.range = rng;
			return styleInfo;
		}
	};
	//#endregion
	//#region src/js/editing/Bullet.js
	var Bullet = class {
		/**
		* toggle ordered list
		*/
		insertOrderedList(editable) {
			this.toggleList("OL", editable);
		}
		/**
		* toggle unordered list
		*/
		insertUnorderedList(editable) {
			this.toggleList("UL", editable);
		}
		/**
		* indent
		*/
		indent(editable) {
			const rng = range_default.create(editable).wrapBodyInlineWithPara();
			const paras = rng.nodes(dom_default.isPara, { includeAncestor: true });
			const clustereds = lists_default.clusterBy(paras, func_default.peq2("parentNode"));
			$$.each(clustereds, (idx, paras) => {
				const head = lists_default.head(paras);
				if (dom_default.isLi(head)) {
					const previousList = this.findList(head.previousSibling);
					if (previousList) paras.map((para) => previousList.appendChild(para));
					else {
						this.wrapList(paras, head.parentNode.nodeName);
						paras.map((para) => para.parentNode).map((para) => this.appendToPrevious(para));
					}
				} else $$.each(paras, (idx, para) => {
					const marginLeft = parseInt($$(para).css("marginLeft"), 10) || 0;
					$$(para).css("marginLeft", marginLeft + 25);
				});
			});
			rng.select();
		}
		/**
		* outdent
		*/
		outdent(editable) {
			const rng = range_default.create(editable).wrapBodyInlineWithPara();
			const paras = rng.nodes(dom_default.isPara, { includeAncestor: true });
			const clustereds = lists_default.clusterBy(paras, func_default.peq2("parentNode"));
			$$.each(clustereds, (idx, paras) => {
				const head = lists_default.head(paras);
				if (dom_default.isLi(head)) this.releaseList([paras]);
				else $$.each(paras, (idx, para) => {
					const marginLeft = parseInt($$(para).css("marginLeft"), 10) || 0;
					$$(para).css("marginLeft", marginLeft > 25 ? marginLeft - 25 : "");
				});
			});
			rng.select();
		}
		/**
		* toggle list
		*
		* @param {String} listName - OL or UL
		*/
		toggleList(listName, editable) {
			const rng = range_default.create(editable).wrapBodyInlineWithPara();
			let paras = rng.nodes(dom_default.isPara, { includeAncestor: true });
			const bookmark = rng.paraBookmark(paras);
			const clustereds = lists_default.clusterBy(paras, func_default.peq2("parentNode"));
			if (lists_default.find(paras, dom_default.isPurePara)) {
				let wrappedParas = [];
				$$.each(clustereds, (idx, paras) => {
					wrappedParas = wrappedParas.concat(this.wrapList(paras, listName));
				});
				paras = wrappedParas;
			} else {
				const diffLists = rng.nodes(dom_default.isList, { includeAncestor: true }).filter((listNode) => {
					return listNode.nodeName !== listName;
				});
				if (diffLists.length) $$.each(diffLists, (idx, listNode) => {
					dom_default.replace(listNode, listName);
				});
				else paras = this.releaseList(clustereds, true);
			}
			range_default.createFromParaBookmark(bookmark, paras).select();
		}
		/**
		* @param {Node[]} paras
		* @param {String} listName
		* @return {Node[]}
		*/
		wrapList(paras, listName) {
			const head = lists_default.head(paras);
			const last = lists_default.last(paras);
			const prevList = dom_default.isList(head.previousSibling) && head.previousSibling;
			const nextList = dom_default.isList(last.nextSibling) && last.nextSibling;
			const listNode = prevList || dom_default.insertAfter(dom_default.create(listName || "UL"), last);
			paras = paras.map((para) => {
				return dom_default.isPurePara(para) ? dom_default.replace(para, "LI") : para;
			});
			dom_default.appendChildNodes(listNode, paras, true);
			if (nextList) {
				dom_default.appendChildNodes(listNode, lists_default.from(nextList.childNodes), true);
				dom_default.remove(nextList);
			}
			return paras;
		}
		/**
		* @method releaseList
		*
		* @param {Array[]} clustereds
		* @param {Boolean} isEscapseToBody
		* @return {Node[]}
		*/
		releaseList(clustereds, isEscapseToBody) {
			let releasedParas = [];
			$$.each(clustereds, (idx, paras) => {
				const head = lists_default.head(paras);
				const last = lists_default.last(paras);
				const headList = isEscapseToBody ? dom_default.lastAncestor(head, dom_default.isList) : head.parentNode;
				const parentItem = headList.parentNode;
				if (headList.parentNode.nodeName === "LI") {
					paras.map((para) => {
						const newList = this.findNextSiblings(para);
						if (parentItem.nextSibling) parentItem.parentNode.insertBefore(para, parentItem.nextSibling);
						else parentItem.parentNode.appendChild(para);
						if (newList.length) {
							this.wrapList(newList, headList.nodeName);
							para.appendChild(newList[0].parentNode);
						}
					});
					if (headList.children.length === 0) parentItem.removeChild(headList);
					if (parentItem.childNodes.length === 0) parentItem.parentNode.removeChild(parentItem);
				} else {
					const lastList = headList.childNodes.length > 1 ? dom_default.splitTree(headList, {
						node: last.parentNode,
						offset: dom_default.position(last) + 1
					}, { isSkipPaddingBlankHTML: true }) : null;
					const middleList = dom_default.splitTree(headList, {
						node: head.parentNode,
						offset: dom_default.position(head)
					}, { isSkipPaddingBlankHTML: true });
					paras = isEscapseToBody ? dom_default.listDescendant(middleList, dom_default.isLi) : lists_default.from(middleList.childNodes).filter(dom_default.isLi);
					if (isEscapseToBody || !dom_default.isList(headList.parentNode)) paras = paras.map((para) => {
						return dom_default.replace(para, "P");
					});
					$$.each(lists_default.from(paras).reverse(), (idx, para) => {
						dom_default.insertAfter(para, headList);
					});
					const rootLists = lists_default.compact([
						headList,
						middleList,
						lastList
					]);
					$$.each(rootLists, (idx, rootList) => {
						const listNodes = [rootList].concat(dom_default.listDescendant(rootList, dom_default.isList));
						$$.each(listNodes.reverse(), (idx, listNode) => {
							if (!dom_default.nodeLength(listNode)) dom_default.remove(listNode, true);
						});
					});
				}
				releasedParas = releasedParas.concat(paras);
			});
			return releasedParas;
		}
		/**
		* @method appendToPrevious
		*
		* Appends list to previous list item, if
		* none exist it wraps the list in a new list item.
		*
		* @param {HTMLNode} ListItem
		* @return {HTMLNode}
		*/
		appendToPrevious(node) {
			return node.previousSibling ? dom_default.appendChildNodes(node.previousSibling, [node]) : this.wrapList([node], "LI");
		}
		/**
		* @method findList
		*
		* Finds an existing list in list item
		*
		* @param {HTMLNode} ListItem
		* @return {Array[]}
		*/
		findList(node) {
			return node ? lists_default.find(node.children, (child) => ["OL", "UL"].indexOf(child.nodeName) > -1) : null;
		}
		/**
		* @method findNextSiblings
		*
		* Finds all list item siblings that follow it
		*
		* @param {HTMLNode} ListItem
		* @return {HTMLNode}
		*/
		findNextSiblings(node) {
			const siblings = [];
			while (node.nextSibling) {
				siblings.push(node.nextSibling);
				node = node.nextSibling;
			}
			return siblings;
		}
	};
	//#endregion
	//#region src/js/editing/Typing.js
	/**
	* @class editing.Typing
	*
	* Typing
	*
	*/
	var Typing = class {
		constructor(context) {
			this.bullet = new Bullet();
			this.options = context.options;
		}
		/**
		* insert tab
		*
		* @param {WrappedRange} rng
		* @param {Number} tabsize
		*/
		insertTab(rng, tabsize) {
			const tab = dom_default.createText(new Array(tabsize + 1).join(dom_default.NBSP_CHAR));
			rng = rng.deleteContents();
			rng.insertNode(tab, true);
			rng = range_default.create(tab, tabsize);
			rng.select();
		}
		/**
		* insert paragraph
		*
		* @param {Element} editable
		* @param {WrappedRange} rng Can be used in unit tests to "mock" the range
		*
		* blockquoteBreakingLevel
		*   0 - No break, the new paragraph remains inside the quote
		*   1 - Break the first blockquote in the ancestors list
		*   2 - Break all blockquotes, so that the new paragraph is not quoted (this is the default)
		*/
		insertParagraph(editable, rng) {
			rng = rng || range_default.create(editable);
			rng = rng.deleteContents();
			rng = rng.wrapBodyInlineWithPara();
			const splitRoot = dom_default.ancestor(rng.sc, dom_default.isPara);
			let nextPara;
			if (splitRoot) if (dom_default.isLi(splitRoot) && (dom_default.isEmpty(splitRoot) || dom_default.deepestChildIsEmpty(splitRoot))) {
				this.bullet.toggleList(splitRoot.parentNode.nodeName);
				return;
			} else {
				let blockquote = null;
				if (this.options.blockquoteBreakingLevel === 1) blockquote = dom_default.ancestor(splitRoot, dom_default.isBlockquote);
				else if (this.options.blockquoteBreakingLevel === 2) blockquote = dom_default.lastAncestor(splitRoot, dom_default.isBlockquote);
				if (blockquote) {
					nextPara = $$.parseHTML(dom_default.emptyPara)[0];
					if (dom_default.isRightEdgePoint(rng.getStartPoint()) && dom_default.isBR(rng.sc.nextSibling)) $$(rng.sc.nextSibling).remove();
					const split = dom_default.splitTree(blockquote, rng.getStartPoint(), { isDiscardEmptySplits: true });
					if (split) split.parentNode.insertBefore(nextPara, split);
					else dom_default.insertAfter(nextPara, blockquote);
				} else {
					nextPara = dom_default.splitTree(splitRoot, rng.getStartPoint());
					let emptyAnchors = dom_default.listDescendant(splitRoot, dom_default.isEmptyAnchor);
					emptyAnchors = emptyAnchors.concat(dom_default.listDescendant(nextPara, dom_default.isEmptyAnchor));
					$$.each(emptyAnchors, (idx, anchor) => {
						dom_default.remove(anchor);
					});
					if ((dom_default.isHeading(nextPara) || dom_default.isPre(nextPara) || dom_default.isCustomStyleTag(nextPara)) && dom_default.isEmpty(nextPara)) nextPara = dom_default.replace(nextPara, "p");
				}
			}
			else {
				const next = rng.sc.childNodes[rng.so];
				nextPara = $$.parseHTML(dom_default.emptyPara)[0];
				if (next) rng.sc.insertBefore(nextPara, next);
				else rng.sc.appendChild(nextPara);
			}
			range_default.create(nextPara, 0).normalize().select().scrollIntoView(editable);
		}
	};
	//#endregion
	//#region src/js/editing/Table.js
	/**
	* @class Create a virtual table to create what actions to do in change.
	* @param {object} startPoint Cell selected to apply change.
	* @param {enum} where  Where change will be applied Row or Col. Use enum: TableResultAction.where
	* @param {enum} action Action to be applied. Use enum: TableResultAction.requestAction
	* @param {object} domTable Dom element of table to make changes.
	*/
	var TableResultAction = function(startPoint, where, action, domTable) {
		const _startPoint = {
			"colPos": 0,
			"rowPos": 0
		};
		const _virtualTable = [];
		const _actionCellList = [];
		/**
		* Set the startPoint of action.
		*/
		function setStartPoint() {
			_startPoint.colPos = startPoint.cellIndex;
			_startPoint.rowPos = startPoint.parentElement.rowIndex;
		}
		/**
		* Define virtual table position info object.
		*
		* @param {int} rowIndex Index position in line of virtual table.
		* @param {int} cellIndex Index position in column of virtual table.
		* @param {object} baseRow Row affected by this position.
		* @param {object} baseCell Cell affected by this position.
		* @param {bool} isSpan Inform if it is an span cell/row.
		*/
		function setVirtualTablePosition(rowIndex, cellIndex, baseRow, baseCell, isRowSpan, isColSpan, isVirtualCell) {
			const objPosition = {
				"baseRow": baseRow,
				"baseCell": baseCell,
				"isRowSpan": isRowSpan,
				"isColSpan": isColSpan,
				"isVirtual": isVirtualCell
			};
			if (!_virtualTable[rowIndex]) _virtualTable[rowIndex] = [];
			_virtualTable[rowIndex][cellIndex] = objPosition;
		}
		/**
		* Create action cell object.
		*
		* @param {object} virtualTableCellObj Object of specific position on virtual table.
		* @param {enum} resultAction Action to be applied in that item.
		*/
		function getActionCell(virtualTableCellObj, resultAction, virtualRowPosition, virtualColPosition) {
			return {
				"baseCell": virtualTableCellObj.baseCell,
				"action": resultAction,
				"virtualTable": {
					"rowIndex": virtualRowPosition,
					"cellIndex": virtualColPosition
				}
			};
		}
		/**
		* Recover free index of row to append Cell.
		*
		* @param {int} rowIndex Index of row to find free space.
		* @param {int} cellIndex Index of cell to find free space in table.
		*/
		function recoverCellIndex(rowIndex, cellIndex) {
			if (!_virtualTable[rowIndex]) return cellIndex;
			if (!_virtualTable[rowIndex][cellIndex]) return cellIndex;
			let newCellIndex = cellIndex;
			while (_virtualTable[rowIndex][newCellIndex]) {
				newCellIndex++;
				if (!_virtualTable[rowIndex][newCellIndex]) return newCellIndex;
			}
		}
		/**
		* Recover info about row and cell and add information to virtual table.
		*
		* @param {object} row Row to recover information.
		* @param {object} cell Cell to recover information.
		*/
		function addCellInfoToVirtual(row, cell) {
			const cellIndex = recoverCellIndex(row.rowIndex, cell.cellIndex);
			const cellHasColspan = cell.colSpan > 1;
			const cellHasRowspan = cell.rowSpan > 1;
			const isThisSelectedCell = row.rowIndex === _startPoint.rowPos && cell.cellIndex === _startPoint.colPos;
			setVirtualTablePosition(row.rowIndex, cellIndex, row, cell, cellHasRowspan, cellHasColspan, false);
			const rowspanNumber = cell.attributes.rowSpan ? parseInt(cell.attributes.rowSpan.value, 10) : 0;
			if (rowspanNumber > 1) for (let rp = 1; rp < rowspanNumber; rp++) {
				const rowspanIndex = row.rowIndex + rp;
				adjustStartPoint(rowspanIndex, cellIndex, cell, isThisSelectedCell);
				setVirtualTablePosition(rowspanIndex, cellIndex, row, cell, true, cellHasColspan, true);
			}
			const colspanNumber = cell.attributes.colSpan ? parseInt(cell.attributes.colSpan.value, 10) : 0;
			if (colspanNumber > 1) for (let cp = 1; cp < colspanNumber; cp++) {
				const cellspanIndex = recoverCellIndex(row.rowIndex, cellIndex + cp);
				adjustStartPoint(row.rowIndex, cellspanIndex, cell, isThisSelectedCell);
				setVirtualTablePosition(row.rowIndex, cellspanIndex, row, cell, cellHasRowspan, true, true);
			}
		}
		/**
		* Process validation and adjust of start point if needed
		*
		* @param {int} rowIndex
		* @param {int} cellIndex
		* @param {object} cell
		* @param {bool} isSelectedCell
		*/
		function adjustStartPoint(rowIndex, cellIndex, cell, isSelectedCell) {
			if (rowIndex === _startPoint.rowPos && _startPoint.colPos >= cell.cellIndex && cell.cellIndex <= cellIndex && !isSelectedCell) _startPoint.colPos++;
		}
		/**
		* Create virtual table of cells with all cells, including span cells.
		*/
		function createVirtualTable() {
			const rows = domTable.rows;
			for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
				const cells = rows[rowIndex].cells;
				for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) addCellInfoToVirtual(rows[rowIndex], cells[cellIndex]);
			}
		}
		/**
		* Get action to be applied on the cell.
		*
		* @param {object} cell virtual table cell to apply action
		*/
		function getDeleteResultActionToCell(cell) {
			switch (where) {
				case TableResultAction.where.Column:
					if (cell.isColSpan) return TableResultAction.resultAction.SubtractSpanCount;
					break;
				case TableResultAction.where.Row:
					if (!cell.isVirtual && cell.isRowSpan) return TableResultAction.resultAction.AddCell;
					else if (cell.isRowSpan) return TableResultAction.resultAction.SubtractSpanCount;
					break;
			}
			return TableResultAction.resultAction.RemoveCell;
		}
		/**
		* Get action to be applied on the cell.
		*
		* @param {object} cell virtual table cell to apply action
		*/
		function getAddResultActionToCell(cell) {
			switch (where) {
				case TableResultAction.where.Column:
					if (cell.isColSpan) return TableResultAction.resultAction.SumSpanCount;
					else if (cell.isRowSpan && cell.isVirtual) return TableResultAction.resultAction.Ignore;
					break;
				case TableResultAction.where.Row:
					if (cell.isRowSpan) return TableResultAction.resultAction.SumSpanCount;
					else if (cell.isColSpan && cell.isVirtual) return TableResultAction.resultAction.Ignore;
					break;
			}
			return TableResultAction.resultAction.AddCell;
		}
		function init() {
			setStartPoint();
			createVirtualTable();
		}
		/**
		* Recover array os what to do in table.
		*/
		this.getActionList = function() {
			const fixedRow = where === TableResultAction.where.Row ? _startPoint.rowPos : -1;
			const fixedCol = where === TableResultAction.where.Column ? _startPoint.colPos : -1;
			let actualPosition = 0;
			while (true) {
				const rowPosition = fixedRow >= 0 ? fixedRow : actualPosition;
				const colPosition = fixedCol >= 0 ? fixedCol : actualPosition;
				const row = _virtualTable[rowPosition];
				if (!row) return _actionCellList;
				const cell = row[colPosition];
				if (!cell) return _actionCellList;
				let resultAction = TableResultAction.resultAction.Ignore;
				switch (action) {
					case TableResultAction.requestAction.Add:
						resultAction = getAddResultActionToCell(cell);
						break;
					case TableResultAction.requestAction.Delete:
						resultAction = getDeleteResultActionToCell(cell);
						break;
				}
				_actionCellList.push(getActionCell(cell, resultAction, rowPosition, colPosition));
				actualPosition++;
			}
		};
		init();
	};
	/**
	*
	* Where action occours enum.
	*/
	TableResultAction.where = {
		"Row": 0,
		"Column": 1
	};
	/**
	*
	* Requested action to apply enum.
	*/
	TableResultAction.requestAction = {
		"Add": 0,
		"Delete": 1
	};
	/**
	*
	* Result action to be executed enum.
	*/
	TableResultAction.resultAction = {
		"Ignore": 0,
		"SubtractSpanCount": 1,
		"RemoveCell": 2,
		"AddCell": 3,
		"SumSpanCount": 4
	};
	/**
	*
	* @class editing.Table
	*
	* Table
	*
	*/
	var Table = class {
		/**
		* handle tab key
		*
		* @param {WrappedRange} rng
		* @param {Boolean} isShift
		*/
		tab(rng, isShift) {
			const cell = dom_default.ancestor(rng.commonAncestor(), dom_default.isCell);
			const table = dom_default.ancestor(cell, dom_default.isTable);
			const cells = dom_default.listDescendant(table, dom_default.isCell);
			const nextCell = lists_default[isShift ? "prev" : "next"](cells, cell);
			if (nextCell) range_default.create(nextCell, 0).select();
		}
		/**
		* Add a new row
		*
		* @param {WrappedRange} rng
		* @param {String} position (top/bottom)
		* @return {Node}
		*/
		addRow(rng, position) {
			const cell = dom_default.ancestor(rng.commonAncestor(), dom_default.isCell);
			const currentTr = $$(cell).closest("tr");
			const trAttributes = this.recoverAttributes(currentTr[0]);
			const html = $$($$.parseHTML("<tr" + trAttributes + "></tr>")[0]);
			const actions = new TableResultAction(cell, TableResultAction.where.Row, TableResultAction.requestAction.Add, currentTr.closest("table")[0]).getActionList();
			for (let idCell = 0; idCell < actions.length; idCell++) {
				const currentCell = actions[idCell];
				const tdAttributes = this.recoverAttributes(currentCell.baseCell);
				switch (currentCell.action) {
					case TableResultAction.resultAction.AddCell:
						html.append($$.parseHTML("<td" + tdAttributes + ">" + dom_default.blank + "</td>")[0]);
						break;
					case TableResultAction.resultAction.SumSpanCount:
						{
							if (position === "top") {
								const tempTd = $$.parseHTML("<td" + tdAttributes + ">" + dom_default.blank + "</td>")[0];
								tempTd.removeAttribute("rowspan");
								html.append(tempTd);
								break;
							}
							let rowspanNumber = parseInt(currentCell.baseCell.rowSpan, 10);
							rowspanNumber++;
							currentCell.baseCell.setAttribute("rowSpan", rowspanNumber);
						}
						break;
				}
			}
			if (position === "top") currentTr.before(html);
			else {
				if (cell.rowSpan > 1) {
					const lastTrIndex = currentTr[0].rowIndex + (cell.rowSpan - 2);
					$$(currentTr.parent().find("tr")[lastTrIndex]).after(html);
					return;
				}
				currentTr.after(html);
			}
		}
		/**
		* Add a new col
		*
		* @param {WrappedRange} rng
		* @param {String} position (left/right)
		* @return {Node}
		*/
		addCol(rng, position) {
			const cell = dom_default.ancestor(rng.commonAncestor(), dom_default.isCell);
			const row = $$(cell).closest("tr");
			const actions = new TableResultAction(cell, TableResultAction.where.Column, TableResultAction.requestAction.Add, row.closest("table")[0]).getActionList();
			for (let actionIndex = 0; actionIndex < actions.length; actionIndex++) {
				const currentCell = actions[actionIndex];
				const tdAttributes = this.recoverAttributes(currentCell.baseCell);
				switch (currentCell.action) {
					case TableResultAction.resultAction.AddCell:
						if (position === "right") $$(currentCell.baseCell).after($$.parseHTML("<td" + tdAttributes + ">" + dom_default.blank + "</td>")[0]);
						else $$(currentCell.baseCell).before($$.parseHTML("<td" + tdAttributes + ">" + dom_default.blank + "</td>")[0]);
						break;
					case TableResultAction.resultAction.SumSpanCount:
						if (position === "right") {
							let colspanNumber = parseInt(currentCell.baseCell.colSpan, 10);
							colspanNumber++;
							currentCell.baseCell.setAttribute("colSpan", colspanNumber);
						} else $$(currentCell.baseCell).before($$.parseHTML("<td" + tdAttributes + ">" + dom_default.blank + "</td>")[0]);
						break;
				}
			}
		}
		recoverAttributes(el) {
			let resultStr = "";
			if (!el) return resultStr;
			const attrList = el.attributes;
			for (let i = 0; i < attrList.length; i++) {
				if (attrList[i].name.toLowerCase() === "id") continue;
				resultStr += " " + attrList[i].name + "='" + attrList[i].value + "'";
			}
			return resultStr;
		}
		/**
		* Delete current row
		*
		* @param {WrappedRange} rng
		* @return {Node}
		*/
		deleteRow(rng) {
			const cell = dom_default.ancestor(rng.commonAncestor(), dom_default.isCell);
			const row = $$(cell).closest("tr");
			const rowEl = row[0];
			const cellPos = Array.from(rowEl.children).filter((c) => c.nodeName === "TD" || c.nodeName === "TH").indexOf(cell);
			const actions = new TableResultAction(cell, TableResultAction.where.Row, TableResultAction.requestAction.Delete, row.closest("table")[0]).getActionList();
			for (let actionIndex = 0; actionIndex < actions.length; actionIndex++) {
				const baseCell = actions[actionIndex].baseCell;
				let rowspanNumber = parseInt(baseCell.rowSpan, 10);
				switch (actions[actionIndex].action) {
					case TableResultAction.resultAction.AddCell:
						{
							const nextRow = rowEl.nextElementSibling;
							const cloneRow = rowEl.cells[cellPos];
							const keepsRowSpan = rowspanNumber > 2;
							nextRow.insertBefore(cloneRow, nextRow.cells[cellPos]);
							if (keepsRowSpan) nextRow.cells[cellPos].setAttribute("rowSpan", rowspanNumber - 1);
							else nextRow.cells[cellPos].removeAttribute("rowSpan");
							nextRow.cells[cellPos].innerHTML = "";
						}
						continue;
					case TableResultAction.resultAction.SubtractSpanCount:
						if (rowspanNumber > 2) baseCell.setAttribute("rowSpan", rowspanNumber - 1);
						else baseCell.removeAttribute("rowSpan");
						continue;
					case TableResultAction.resultAction.RemoveCell: continue;
				}
			}
			row.remove();
		}
		/**
		* Delete current col
		*
		* @param {WrappedRange} rng
		* @return {Node}
		*/
		deleteCol(rng) {
			const cell = dom_default.ancestor(rng.commonAncestor(), dom_default.isCell);
			const row = $$(cell).closest("tr");
			const rowEl = row[0];
			const cellPos = Array.from(rowEl.children).filter((c) => c.nodeName === "TD" || c.nodeName === "TH").indexOf(cell);
			const actions = new TableResultAction(cell, TableResultAction.where.Column, TableResultAction.requestAction.Delete, row.closest("table")[0]).getActionList();
			for (let actionIndex = 0; actionIndex < actions.length; actionIndex++) switch (actions[actionIndex].action) {
				case TableResultAction.resultAction.SubtractSpanCount:
					{
						const baseCell = actions[actionIndex].baseCell;
						let colspanNumber = parseInt(baseCell.colSpan, 10);
						if (colspanNumber > 2) {
							baseCell.setAttribute("colSpan", colspanNumber - 1);
							if (baseCell.cellIndex === cellPos) baseCell.innerHTML = "";
						} else {
							baseCell.removeAttribute("colSpan");
							if (baseCell.cellIndex === cellPos) baseCell.innerHTML = "";
						}
					}
					continue;
				case TableResultAction.resultAction.RemoveCell:
					dom_default.remove(actions[actionIndex].baseCell, true);
					continue;
			}
		}
		/**
		* create empty table element
		*
		* @param {Number} rowCount
		* @param {Number} colCount
		* @return {Node}
		*/
		createTable(colCount, rowCount, options) {
			const tds = [];
			let tdHTML;
			for (let idxCol = 0; idxCol < colCount; idxCol++) tds.push("<td>" + dom_default.blank + "</td>");
			tdHTML = tds.join("");
			const trs = [];
			let trHTML;
			for (let idxRow = 0; idxRow < rowCount; idxRow++) trs.push("<tr>" + tdHTML + "</tr>");
			trHTML = trs.join("");
			const table = $$.parseHTML("<table>" + trHTML + "</table>")[0];
			if (options && options.tableClassName) $$(table).addClass(options.tableClassName);
			return table;
		}
		/**
		* Delete current table
		*
		* @param {WrappedRange} rng
		* @return {Node}
		*/
		deleteTable(rng) {
			$$(dom_default.ancestor(rng.commonAncestor(), dom_default.isCell)).closest("table").remove();
		}
	};
	//#endregion
	//#region src/js/module/Editor.js
	var KEY_BOGUS = "bogus";
	var MAILTO_PATTERN$1 = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	var TEL_PATTERN$1 = /^\+?\d[\d\s-]{5,}\d$/;
	var URL_SCHEME_PATTERN$1 = /^([A-Za-z][A-Za-z0-9+-.]*\:|#|\/)/;
	/**
	* @class Editor
	*/
	var Editor = class {
		constructor(context) {
			this.context = context;
			this.$note = context.layoutInfo.note;
			this.$editor = context.layoutInfo.editor;
			this.$editable = context.layoutInfo.editable;
			this.options = context.options;
			this.lang = this.options.langInfo;
			this.editable = this.$editable[0];
			this.lastRange = null;
			this.snapshot = null;
			this.style = new Style();
			this.table = new Table();
			this.typing = new Typing(context);
			this.bullet = new Bullet();
			this.history = new History(context);
			this.context.memo("help.escape", this.lang.help.escape);
			this.context.memo("help.undo", this.lang.help.undo);
			this.context.memo("help.redo", this.lang.help.redo);
			this.context.memo("help.tab", this.lang.help.tab);
			this.context.memo("help.untab", this.lang.help.untab);
			this.context.memo("help.insertParagraph", this.lang.help.insertParagraph);
			this.context.memo("help.insertOrderedList", this.lang.help.insertOrderedList);
			this.context.memo("help.insertUnorderedList", this.lang.help.insertUnorderedList);
			this.context.memo("help.indent", this.lang.help.indent);
			this.context.memo("help.outdent", this.lang.help.outdent);
			this.context.memo("help.formatPara", this.lang.help.formatPara);
			this.context.memo("help.insertHorizontalRule", this.lang.help.insertHorizontalRule);
			this.context.memo("help.fontName", this.lang.help.fontName);
			const commands = [
				"bold",
				"italic",
				"underline",
				"strikethrough",
				"superscript",
				"subscript",
				"justifyLeft",
				"justifyCenter",
				"justifyRight",
				"justifyFull",
				"formatBlock",
				"removeFormat",
				"backColor"
			];
			for (let idx = 0, len = commands.length; idx < len; idx++) {
				this[commands[idx]] = ((sCmd) => {
					return (value) => {
						this.beforeCommand();
						document.execCommand(sCmd, false, value);
						this.afterCommand(true);
					};
				})(commands[idx]);
				this.context.memo("help." + commands[idx], this.lang.help[commands[idx]]);
			}
			this.fontName = this.wrapCommand((value) => {
				return this.fontStyling("font-family", env_default.validFontName(value));
			});
			this.fontSize = this.wrapCommand((value) => {
				const unit = this.currentStyle()["font-size-unit"];
				return this.fontStyling("font-size", value + unit);
			});
			this.fontSizeUnit = this.wrapCommand((value) => {
				const size = this.currentStyle()["font-size"];
				return this.fontStyling("font-size", size + value);
			});
			for (let idx = 1; idx <= 6; idx++) {
				this["formatH" + idx] = ((idx) => {
					return () => {
						this.formatBlock("H" + idx);
					};
				})(idx);
				this.context.memo("help.formatH" + idx, this.lang.help["formatH" + idx]);
			}
			this.insertParagraph = this.wrapCommand(() => {
				this.typing.insertParagraph(this.editable);
			});
			this.insertOrderedList = this.wrapCommand(() => {
				this.bullet.insertOrderedList(this.editable);
			});
			this.insertUnorderedList = this.wrapCommand(() => {
				this.bullet.insertUnorderedList(this.editable);
			});
			this.indent = this.wrapCommand(() => {
				this.bullet.indent(this.editable);
			});
			this.outdent = this.wrapCommand(() => {
				this.bullet.outdent(this.editable);
			});
			/**
			* insertNode
			* insert node
			* @param {Node} node
			*/
			this.insertNode = this.wrapCommand((node) => {
				if (this.isLimited($$(node).text().length)) return;
				this.getLastRange().insertNode(node);
				this.setLastRange(range_default.createFromNodeAfter(node).select());
			});
			/**
			* insert text
			* @param {String} text
			*/
			this.insertText = this.wrapCommand((text) => {
				if (this.isLimited(text.length)) return;
				const textNode = this.getLastRange().insertNode(dom_default.createText(text));
				this.setLastRange(range_default.create(textNode, dom_default.nodeLength(textNode)).select());
			});
			/**
			* paste HTML
			* @param {String} markup
			*/
			this.pasteHTML = this.wrapCommand((markup) => {
				if (this.isLimited(markup.length)) return;
				markup = this.context.invoke("codeview.purify", markup);
				const contents = this.getLastRange().pasteHTML(markup);
				this.setLastRange(range_default.createFromNodeAfter(lists_default.last(contents)).select());
			});
			/**
			* formatBlock
			*
			* @param {String} tagName
			*/
			this.formatBlock = this.wrapCommand((tagName, $target) => {
				const onApplyCustomStyle = this.options.callbacks.onApplyCustomStyle;
				if (onApplyCustomStyle) onApplyCustomStyle.call(this, $target, this.context, this.onFormatBlock);
				else this.onFormatBlock(tagName, $target);
			});
			/**
			* insert horizontal rule
			*/
			this.insertHorizontalRule = this.wrapCommand(() => {
				const hrNode = this.getLastRange().insertNode(dom_default.create("HR"));
				if (hrNode.nextSibling) this.setLastRange(range_default.create(hrNode.nextSibling, 0).normalize().select());
			});
			/**
			* lineHeight
			* @param {String} value
			*/
			this.lineHeight = this.wrapCommand((value) => {
				this.style.stylePara(this.getLastRange(), { lineHeight: value });
			});
			/**
			* create link (command)
			*
			* @param {Object} linkInfo
			*/
			this.createLink = this.wrapCommand((linkInfo) => {
				let rel = [];
				let linkUrl = linkInfo.url;
				const linkText = linkInfo.text;
				const isNewWindow = linkInfo.isNewWindow;
				const addNoReferrer = this.options.linkAddNoReferrer;
				const addNoOpener = this.options.linkAddNoOpener;
				let rng = linkInfo.range || this.getLastRange();
				const additionalTextLength = linkText.length - rng.toString().length;
				if (additionalTextLength > 0 && this.isLimited(additionalTextLength)) return;
				const isTextChanged = rng.toString() !== linkText;
				if (typeof linkUrl === "string") linkUrl = linkUrl.trim();
				if (this.options.onCreateLink) linkUrl = this.options.onCreateLink(linkUrl);
				else linkUrl = this.checkLinkUrl(linkUrl);
				let anchors = [];
				if (isTextChanged) {
					rng = rng.deleteContents();
					const anchor = rng.insertNode($$("<A></A>").text(linkText)[0]);
					anchors.push(anchor);
				} else anchors = this.style.styleNodes(rng, {
					nodeName: "A",
					expandClosestSibling: true,
					onlyPartialContains: true
				});
				$$.each(anchors, (idx, anchor) => {
					$$(anchor).attr("href", linkUrl);
					if (isNewWindow) {
						$$(anchor).attr("target", "_blank");
						if (addNoReferrer) rel.push("noreferrer");
						if (addNoOpener) rel.push("noopener");
						if (rel.length) $$(anchor).attr("rel", rel.join(" "));
					} else $$(anchor).removeAttr("target");
				});
				this.setLastRange(this.createRangeFromList(anchors).select());
			});
			/**
			* setting color
			*
			* @param {Object} sObjColor  color code
			* @param {String} sObjColor.foreColor foreground color
			* @param {String} sObjColor.backColor background color
			*/
			this.color = this.wrapCommand((colorInfo) => {
				const foreColor = colorInfo.foreColor;
				const backColor = colorInfo.backColor;
				if (foreColor) document.execCommand("foreColor", false, foreColor);
				if (backColor) document.execCommand("backColor", false, backColor);
			});
			/**
			* Set foreground color
			*
			* @param {String} colorCode foreground color code
			*/
			this.foreColor = this.wrapCommand((colorInfo) => {
				document.execCommand("foreColor", false, colorInfo);
			});
			/**
			* insert Table
			*
			* @param {String} dimension of table (ex : "5x5")
			*/
			this.insertTable = this.wrapCommand((dim) => {
				const dimension = dim.split("x");
				this.getLastRange().deleteContents().insertNode(this.table.createTable(dimension[0], dimension[1], this.options));
			});
			/**
			* remove media object and Figure Elements if media object is img with Figure.
			*/
			this.removeMedia = this.wrapCommand(() => {
				let $target = $$(this.restoreTarget()).parent();
				if ($target.closest("figure").length) $target.closest("figure").remove();
				else $target = $$(this.restoreTarget()).detach();
				this.setLastRange(range_default.createFromSelection($target).select());
				this.context.triggerEvent("media.delete", $target, this.$editable);
			});
			/**
			* float me
			*
			* @param {String} value
			*/
			this.floatMe = this.wrapCommand((value) => {
				const $target = $$(this.restoreTarget());
				$target.toggleClass("note-float-left", value === "left");
				$target.toggleClass("note-float-right", value === "right");
				$target.css("float", value === "none" ? "" : value);
			});
			/**
			* resize overlay element
			* @param {String} value
			*/
			this.resize = this.wrapCommand((value) => {
				const $target = $$(this.restoreTarget());
				value = parseFloat(value);
				if (value === 0) $target.css("width", "");
				else $target.css({
					width: value * 100 + "%",
					height: ""
				});
			});
			this.playMedia = this.wrapCommand(() => {
				const target = this.restoreTarget();
				if (!target) return;
				$$(target).addClass("note-video-interactive");
				if (target instanceof HTMLVideoElement) {
					if (typeof target.play === "function") target.play();
					return;
				}
				if (target instanceof HTMLIFrameElement) {
					const source = target.getAttribute("src");
					if (!source) return;
					const normalizedSource = source.startsWith("//") ? `${window.location.protocol}${source}` : source;
					const url = new URL(normalizedSource, window.location.href);
					url.searchParams.set("autoplay", "1");
					const nextSource = source.startsWith("//") ? url.toString().replace(/^https?:/, "") : url.toString();
					target.setAttribute("src", nextSource);
				}
			});
		}
		initialize() {
			this.$editable.on("keydown", (event) => {
				if (event.keyCode === key_default.code.ENTER) this.context.triggerEvent("enter", event);
				this.context.triggerEvent("keydown", event);
				this.snapshot = this.history.makeSnapshot();
				this.hasKeyShortCut = false;
				if (!event.isDefaultPrevented()) if (this.options.shortcuts) this.hasKeyShortCut = this.handleKeyMap(event);
				else this.preventDefaultEditableShortCuts(event);
				if (this.isLimited(1, event)) {
					const lastRange = this.getLastRange();
					if (lastRange.eo - lastRange.so === 0) return false;
				}
				this.setLastRange();
				if (this.options.recordEveryKeystroke) {
					if (this.hasKeyShortCut === false) this.history.recordUndo();
				}
			}).on("keyup", (event) => {
				this.setLastRange();
				this.context.triggerEvent("keyup", event);
			}).on("focus", (event) => {
				this.setLastRange();
				this.context.triggerEvent("focus", event);
			}).on("blur", (event) => {
				this.context.triggerEvent("blur", event);
			}).on("mousedown", (event) => {
				this.context.triggerEvent("mousedown", event);
			}).on("mouseup", (event) => {
				this.setLastRange();
				this.history.recordUndo();
				this.context.triggerEvent("mouseup", event);
			}).on("scroll", (event) => {
				this.context.triggerEvent("scroll", event);
			}).on("paste", (event) => {
				this.setLastRange();
				this.context.triggerEvent("paste", event);
			}).on("copy", (event) => {
				this.context.triggerEvent("copy", event);
			}).on("input", () => {
				if (this.isLimited(0) && this.snapshot) this.history.applySnapshot(this.snapshot);
			});
			this.$editable.attr("spellcheck", this.options.spellCheck);
			this.$editable.attr("autocorrect", this.options.spellCheck);
			if (this.options.disableGrammar) this.$editable.attr("data-gramm", false);
			this.$editable.html(dom_default.html(this.$note) || dom_default.emptyPara);
			this.$editable.on(env_default.inputEventName, func_default.debounce(() => {
				this.context.triggerEvent("change", this.$editable.html(), this.$editable);
			}, 10));
			this.$editable.on("focusin", (event) => {
				this.context.triggerEvent("focusin", event);
			}).on("focusout", (event) => {
				this.context.triggerEvent("focusout", event);
			});
			if (this.options.airMode) {
				if (this.options.overrideContextMenu) this.$editor.on("contextmenu", (event) => {
					this.context.triggerEvent("contextmenu", event);
					return false;
				});
			} else {
				if (this.options.width) this.$editor.outerWidth(this.options.width);
				if (this.options.height) this.$editable.outerHeight(this.options.height);
				if (this.options.maxHeight) this.$editable.css("max-height", this.options.maxHeight);
				if (this.options.minHeight) this.$editable.css("min-height", this.options.minHeight);
			}
			this.history.recordUndo();
			this.setLastRange();
		}
		destroy() {
			this.$editable.off();
		}
		handleKeyMap(event) {
			const keyMap = this.options.keyMap[env_default.isMac ? "mac" : "pc"];
			const keys = [];
			if (event.metaKey) keys.push("CMD");
			if (event.ctrlKey && !event.altKey) keys.push("CTRL");
			if (event.shiftKey) keys.push("SHIFT");
			const keyName = key_default.nameFromCode[event.keyCode];
			if (keyName) keys.push(keyName);
			const eventName = keyMap[keys.join("+")];
			if (keyName === "TAB" && !this.options.tabDisable) this.afterCommand();
			else if (eventName) {
				if (this.context.invoke(eventName) !== false) {
					event.preventDefault();
					return true;
				}
			} else if (key_default.isEdit(event.keyCode)) {
				if (key_default.isRemove(event.keyCode)) this.context.invoke("removed");
				this.afterCommand();
			}
			return false;
		}
		preventDefaultEditableShortCuts(event) {
			if ((event.ctrlKey || event.metaKey) && lists_default.contains([
				66,
				73,
				85
			], event.keyCode)) event.preventDefault();
		}
		isLimited(pad, event) {
			pad = pad || 0;
			if (typeof event !== "undefined") {
				if (key_default.isMove(event.keyCode) || key_default.isNavigation(event.keyCode) || event.ctrlKey || event.metaKey || lists_default.contains([key_default.code.BACKSPACE, key_default.code.DELETE], event.keyCode)) return false;
			}
			if (this.options.maxTextLength > 0) {
				if (this.$editable.text().length + pad > this.options.maxTextLength) return true;
			}
			return false;
		}
		checkLinkUrl(linkUrl) {
			if (MAILTO_PATTERN$1.test(linkUrl)) return "mailto:" + linkUrl;
			else if (TEL_PATTERN$1.test(linkUrl)) return "tel:" + linkUrl;
			else if (!URL_SCHEME_PATTERN$1.test(linkUrl)) return "http://" + linkUrl;
			return linkUrl;
		}
		/**
		* create range
		* @return {WrappedRange}
		*/
		createRange() {
			this.focus();
			this.setLastRange();
			return this.getLastRange();
		}
		/**
		* create a new range from the list of elements
		*
		* @param {list} dom element list
		* @return {WrappedRange}
		*/
		createRangeFromList(lst) {
			const startPoint = range_default.createFromNodeBefore(lists_default.head(lst)).getStartPoint();
			const endPoint = range_default.createFromNodeAfter(lists_default.last(lst)).getEndPoint();
			return range_default.create(startPoint.node, startPoint.offset, endPoint.node, endPoint.offset);
		}
		/**
		* set the last range
		*
		* if given rng is exist, set rng as the last range
		* or create a new range at the end of the document
		*
		* @param {WrappedRange} rng
		*/
		setLastRange(rng) {
			if (rng) this.lastRange = rng;
			else {
				this.lastRange = range_default.create(this.editable);
				if ($$(this.lastRange.sc).closest(".note-editable").length === 0) this.lastRange = range_default.createFromBodyElement(this.editable);
			}
		}
		/**
		* get the last range
		*
		* if there is a saved last range, return it
		* or create a new range and return it
		*
		* @return {WrappedRange}
		*/
		getLastRange() {
			const currentSelection = range_default.createFromSelection();
			const selectionContainer = currentSelection?.sc?.nodeType === Node.TEXT_NODE ? currentSelection.sc.parentElement : currentSelection?.sc;
			if (currentSelection && $$(selectionContainer).closest(".note-editable").get(0) === this.editable) {
				this.lastRange = currentSelection;
				return this.lastRange;
			}
			if (!this.lastRange) this.setLastRange();
			return this.lastRange;
		}
		/**
		* saveRange
		*
		* save current range
		*
		* @param {Boolean} [thenCollapse=false]
		*/
		saveRange(thenCollapse) {
			const currentRange = this.getLastRange();
			if (thenCollapse) currentRange.collapse().select();
		}
		/**
		* restoreRange
		*
		* restore lately range
		*/
		restoreRange() {
			if (this.lastRange) {
				this.lastRange.select();
				this.focus();
			}
		}
		saveTarget(node) {
			this.$editable.data("target", node);
		}
		clearTarget() {
			this.$editable.removeData("target");
		}
		restoreTarget() {
			return this.$editable.data("target");
		}
		getTableCommandRange() {
			const rng = this.getLastRange(this.$editable);
			if (rng.isCollapsed() && rng.isOnCell()) return rng;
			const target = this.restoreTarget();
			const cell = dom_default.isCell(target) ? target : dom_default.ancestor(target, dom_default.isCell);
			if (!cell || !this.editable.contains(cell)) return null;
			const cellRange = range_default.createFromNode(cell).collapse(true);
			this.setLastRange(cellRange);
			return cellRange;
		}
		/**
		* currentStyle
		*
		* current style
		* @return {Object|Boolean} unfocus
		*/
		currentStyle() {
			const rng = this.getLastRange();
			return rng ? this.style.current(rng.normalize()) : this.style.fromNode(this.$editable);
		}
		/**
		* style from node
		*
		* @param {DomQuery|Element} $node
		* @return {Object}
		*/
		styleFromNode($node) {
			return this.style.fromNode($node);
		}
		/**
		* undo
		*/
		undo() {
			this.context.triggerEvent("before.command", this.$editable.html());
			this.history.undo();
			this.context.triggerEvent("change", this.$editable.html(), this.$editable);
		}
		commit() {
			this.context.triggerEvent("before.command", this.$editable.html());
			this.history.commit();
			this.context.triggerEvent("change", this.$editable.html(), this.$editable);
		}
		/**
		* redo
		*/
		redo() {
			this.context.triggerEvent("before.command", this.$editable.html());
			this.history.redo();
			this.context.triggerEvent("change", this.$editable.html(), this.$editable);
		}
		/**
		* before command
		*/
		beforeCommand() {
			this.context.triggerEvent("before.command", this.$editable.html());
			document.execCommand("styleWithCSS", false, this.options.styleWithCSS);
			this.focus();
		}
		/**
		* after command
		* @param {Boolean} isPreventTrigger
		*/
		afterCommand(isPreventTrigger) {
			this.normalizeContent();
			this.history.recordUndo();
			if (!isPreventTrigger) this.context.triggerEvent("change", this.$editable.html(), this.$editable);
		}
		/**
		* handle tab key
		*/
		tab() {
			const rng = this.getLastRange();
			if (rng.isCollapsed() && rng.isOnCell()) this.table.tab(rng);
			else {
				if (this.options.tabSize === 0) return false;
				if (!this.isLimited(this.options.tabSize)) {
					this.beforeCommand();
					this.typing.insertTab(rng, this.options.tabSize);
					this.afterCommand();
				}
			}
		}
		/**
		* handle shift+tab key
		*/
		untab() {
			const rng = this.getLastRange();
			if (rng.isCollapsed() && rng.isOnCell()) this.table.tab(rng, true);
			else if (this.options.tabSize === 0) return false;
		}
		/**
		* run given function between beforeCommand and afterCommand
		*/
		wrapCommand(fn) {
			return function() {
				this.beforeCommand();
				fn.apply(this, arguments);
				this.afterCommand();
			};
		}
		/**
		* removed (function added by 1der1)
		*/
		removed(rng, node, tagName) {
			rng = range_default.create();
			if (rng.isCollapsed() && rng.isOnCell()) {
				node = rng.ec;
				if ((tagName = node.tagName) && node.childElementCount === 1 && node.childNodes[0].tagName === "BR") {
					if (tagName === "P") node.remove();
					else if (["TH", "TD"].indexOf(tagName) >= 0) node.firstChild.remove();
				}
			}
		}
		/**
		* insert image
		*
		* @param {String} src
		* @param {String|Function} param
		* @return {Promise}
		*/
		insertImage(src, param) {
			const insertRange = this.getLastRange();
			const normalizedInsertRange = dom_default.isEditable(insertRange.sc) && dom_default.isEditable(insertRange.ec) ? range_default.createFromBodyElement(this.editable, insertRange.isCollapsed() && insertRange.so === 0) : insertRange;
			return createImage(src, param).then(($image) => {
				this.beforeCommand();
				if (typeof param === "function") param($image);
				else {
					if (typeof param === "string") $image.attr("data-filename", param);
					const imageNode = $image[0];
					const editableWidth = this.$editable.width();
					const intrinsicWidth = imageNode?.naturalWidth || imageNode?.width || $image.width();
					if (editableWidth && intrinsicWidth && intrinsicWidth > editableWidth) $image.css("width", editableWidth);
					else $image.css("width", "");
				}
				$image.show();
				normalizedInsertRange.insertNode($image[0]);
				this.setLastRange(range_default.createFromNodeAfter($image[0]).select());
				this.afterCommand();
			}).catch((e) => {
				this.context.triggerEvent("image.upload.error", e);
			});
		}
		/**
		* insertImages
		* @param {File[]} files
		*/
		insertImagesAsDataURL(files) {
			$$.each(files, (idx, file) => {
				const filename = file.name;
				if (this.options.maximumImageFileSize && this.options.maximumImageFileSize < file.size) this.context.triggerEvent("image.upload.error", this.lang.image.maximumFileSizeError);
				else readFileAsDataURL(file).then((dataURL) => {
					return this.insertImage(dataURL, filename);
				}).catch(() => {
					this.context.triggerEvent("image.upload.error");
				});
			});
		}
		/**
		* insertImagesOrCallback
		* @param {File[]} files
		*/
		insertImagesOrCallback(files) {
			const callbacks = this.options.callbacks;
			const normalizedFiles = Array.from(files || []);
			if (!normalizedFiles.length) return;
			if (callbacks.onImageUpload) this.context.triggerEvent("image.upload", normalizedFiles);
			else this.insertImagesAsDataURL(normalizedFiles);
		}
		/**
		* return selected plain text
		* @return {String} text
		*/
		getSelectedText() {
			let rng = this.getLastRange();
			if (rng.isOnAnchor()) rng = range_default.createFromNode(dom_default.ancestor(rng.sc, dom_default.isAnchor));
			return rng.toString();
		}
		onFormatBlock(tagName, $target) {
			document.execCommand("FormatBlock", false, env_default.isMSIE ? "<" + tagName + ">" : tagName);
			if ($target && $target.length) {
				if ($target[0].tagName.toUpperCase() !== tagName.toUpperCase()) $target = $target.find(tagName);
				if ($target && $target.length) {
					const currentRange = this.createRange();
					const $parent = $$([currentRange.sc, currentRange.ec]).closest(tagName);
					$parent.removeClass();
					const className = $target[0].className || "";
					if (className) $parent.addClass(className);
				}
			}
		}
		formatPara() {
			this.formatBlock("P");
		}
		fontStyling(target, value) {
			const rng = this.getLastRange();
			if (rng !== "") {
				const spans = this.style.styleNodes(rng);
				this.$editor.find(".note-status-output").html("");
				$$(spans).css(target, value);
				if (rng.isCollapsed()) {
					const firstSpan = lists_default.head(spans);
					if (firstSpan && !dom_default.nodeLength(firstSpan)) {
						firstSpan.innerHTML = dom_default.ZERO_WIDTH_NBSP_CHAR;
						range_default.createFromNode(firstSpan.firstChild).select();
						this.setLastRange();
						this.$editable.data(KEY_BOGUS, firstSpan);
					}
				} else rng.select();
			} else {
				const noteStatusOutput = Date.now();
				this.$editor.find(".note-status-output").html("<div id=\"note-status-output-" + noteStatusOutput + "\" class=\"alert alert-info\">" + this.lang.output.noSelection + "</div>");
				setTimeout(function() {
					$$("#note-status-output-" + noteStatusOutput).remove();
				}, 5e3);
			}
		}
		/**
		* unlink
		*
		* @type command
		*/
		unlink() {
			let rng = this.getLastRange();
			if (rng.isOnAnchor()) {
				const anchor = dom_default.ancestor(rng.sc, dom_default.isAnchor);
				rng = range_default.createFromNode(anchor);
				rng.select();
				this.setLastRange();
				this.beforeCommand();
				document.execCommand("unlink");
				this.afterCommand();
			}
		}
		/**
		* returns link info
		*
		* @return {Object}
		* @return {WrappedRange} return.range
		* @return {String} return.text
		* @return {Boolean} [return.isNewWindow=true]
		* @return {String} [return.url=""]
		*/
		getLinkInfo() {
			if (!this.hasFocus()) this.focus();
			const rng = this.getLastRange().expand(dom_default.isAnchor);
			const $anchor = $$(lists_default.head(rng.nodes(dom_default.isAnchor)));
			const linkInfo = {
				range: rng,
				text: rng.toString(),
				url: $anchor.length ? $anchor.attr("href") : ""
			};
			if ($anchor.length) linkInfo.isNewWindow = $anchor.attr("target") === "_blank";
			return linkInfo;
		}
		addRow(position) {
			const rng = this.getTableCommandRange();
			if (rng) {
				this.beforeCommand();
				this.table.addRow(rng, position);
				this.afterCommand();
			}
		}
		addCol(position) {
			const rng = this.getTableCommandRange();
			if (rng) {
				this.beforeCommand();
				this.table.addCol(rng, position);
				this.afterCommand();
			}
		}
		deleteRow() {
			const rng = this.getTableCommandRange();
			if (rng) {
				this.beforeCommand();
				this.table.deleteRow(rng);
				this.afterCommand();
			}
		}
		deleteCol() {
			const rng = this.getTableCommandRange();
			if (rng) {
				this.beforeCommand();
				this.table.deleteCol(rng);
				this.afterCommand();
			}
		}
		deleteTable() {
			const rng = this.getTableCommandRange();
			if (rng) {
				this.beforeCommand();
				this.table.deleteTable(rng);
				this.afterCommand();
			}
		}
		/**
		* @param {Position} pos
		* @param {DomQuery} $target - target element
		* @param {Boolean} [bKeepRatio] - keep ratio
		*/
		resizeTo(pos, $target, bKeepRatio) {
			let imageSize;
			if (bKeepRatio) {
				const newRatio = pos.y / pos.x;
				const ratio = $target.data("ratio");
				imageSize = {
					width: ratio > newRatio ? pos.x : pos.y / ratio,
					height: ratio > newRatio ? pos.x * ratio : pos.y
				};
			} else imageSize = {
				width: pos.x,
				height: pos.y
			};
			$target.css(imageSize);
		}
		/**
		* returns whether editable area has focus or not.
		*/
		hasFocus() {
			return this.$editable.is(":focus");
		}
		/**
		* set focus
		*/
		focus() {
			if (!this.hasFocus()) {
				const preservedRange = this.lastRange;
				this.$editable.trigger("focus");
				if (preservedRange) {
					preservedRange.select();
					this.lastRange = preservedRange;
				}
			}
		}
		/**
		* returns whether contents is empty or not.
		* @return {Boolean}
		*/
		isEmpty() {
			return dom_default.isEmpty(this.$editable[0]) || dom_default.emptyPara === this.$editable.html();
		}
		/**
		* Removes all contents and restores the editable instance to an _emptyPara_.
		*/
		empty() {
			this.context.invoke("code", dom_default.emptyPara);
		}
		/**
		* normalize content
		*/
		normalizeContent() {
			this.$editable[0].normalize();
		}
	};
	//#endregion
	//#region src/js/module/Clipboard.js
	var Clipboard = class {
		constructor(context) {
			this.context = context;
			this.options = context.options;
			this.$editable = context.layoutInfo.editable;
		}
		initialize() {
			this.$editable.on("paste", this.pasteByEvent.bind(this));
		}
		/**
		* paste by clipboard event
		*
		* @param {Event} event
		*/
		pasteByEvent(event) {
			if (this.context.isDisabled()) return;
			const clipboardData = event.originalEvent.clipboardData;
			if (clipboardData && clipboardData.items && clipboardData.items.length) {
				const clipboardFiles = clipboardData.files;
				const clipboardText = clipboardData.getData("Text");
				if (clipboardFiles.length > 0 && this.options.allowClipboardImagePasting) {
					this.context.invoke("editor.insertImagesOrCallback", clipboardFiles);
					event.preventDefault();
				}
				if (clipboardText.length > 0 && this.context.invoke("editor.isLimited", clipboardText.length)) event.preventDefault();
			} else if (window.clipboardData) {
				let text = window.clipboardData.getData("text");
				if (this.context.invoke("editor.isLimited", text.length)) event.preventDefault();
			}
			setTimeout(() => {
				this.context.invoke("editor.afterCommand");
			}, 10);
		}
	};
	//#endregion
	//#region src/js/module/Dropzone.js
	var Dropzone = class {
		constructor(context) {
			this.context = context;
			this.$eventListener = $$(document);
			this.$editor = context.layoutInfo.editor;
			this.$editable = context.layoutInfo.editable;
			this.options = context.options;
			this.lang = this.options.langInfo;
			this.documentEventHandlers = {};
			const dropzoneHtml = [
				"<div class=\"note-dropzone\">",
				"<div class=\"note-dropzone-message\"></div>",
				"</div>"
			].join("");
			const dropzoneEl = $$.parseHTML(dropzoneHtml)[0];
			this.$dropzone = $$(dropzoneEl);
			this.$editor.prepend(this.$dropzone);
		}
		/**
		* attach Drag and Drop Events
		*/
		initialize() {
			if (this.options.disableDragAndDrop) {
				this.documentEventHandlers.onDrop = (e) => {
					e.preventDefault();
				};
				this.$eventListener = this.$dropzone;
				this.$eventListener.on("drop", this.documentEventHandlers.onDrop);
			} else this.attachDragAndDropEvent();
		}
		/**
		* attach Drag and Drop Events
		*/
		attachDragAndDropEvent() {
			let collection = [];
			const $dropzoneMessage = this.$dropzone.find(".note-dropzone-message");
			this.documentEventHandlers.onDragenter = (e) => {
				const isCodeview = this.context.invoke("codeview.isActivated");
				const hasEditorSize = this.$editor.width() > 0 && this.$editor.height() > 0;
				if (!isCodeview && !collection.length && hasEditorSize) {
					this.$editor.addClass("dragover");
					this.$dropzone.width(this.$editor.width());
					this.$dropzone.height(this.$editor.height());
					$dropzoneMessage.text(this.lang.image.dragImageHere);
				}
				if (!collection.includes(e.target)) collection.push(e.target);
			};
			this.documentEventHandlers.onDragleave = (e) => {
				collection = collection.filter((t) => t !== e.target);
				if (!collection.length || e.target.nodeName === "BODY") {
					collection = [];
					this.$editor.removeClass("dragover");
				}
			};
			this.documentEventHandlers.onDrop = () => {
				collection = [];
				this.$editor.removeClass("dragover");
			};
			this.$eventListener.on("dragenter", this.documentEventHandlers.onDragenter).on("dragleave", this.documentEventHandlers.onDragleave).on("drop", this.documentEventHandlers.onDrop);
			this.$dropzone.on("dragenter", () => {
				this.$dropzone.addClass("hover");
				$dropzoneMessage.text(this.lang.image.dropImage);
			}).on("dragleave", () => {
				this.$dropzone.removeClass("hover");
				$dropzoneMessage.text(this.lang.image.dragImageHere);
			});
			this.$dropzone.on("drop", (event) => {
				const dataTransfer = event.dataTransfer;
				event.preventDefault();
				if (dataTransfer && dataTransfer.files && dataTransfer.files.length) {
					this.$editable.focus();
					this.context.invoke("editor.insertImagesOrCallback", dataTransfer.files);
				} else $$.each(dataTransfer.types, (idx, type) => {
					if (type.toLowerCase().indexOf("_moz_") > -1) return;
					const content = dataTransfer.getData(type);
					if (type.toLowerCase().indexOf("text") > -1) this.context.invoke("editor.pasteHTML", content);
					else $$.parseHTML(content).forEach((item) => {
						this.context.invoke("editor.insertNode", item);
					});
				});
			}).on("dragover", (e) => {
				e.preventDefault();
			});
		}
		destroy() {
			Object.keys(this.documentEventHandlers).forEach((key) => {
				this.$eventListener.off(key.slice(2).toLowerCase(), this.documentEventHandlers[key]);
			});
			this.documentEventHandlers = {};
		}
	};
	//#endregion
	//#region src/js/module/Codeview.js
	/**
	* @class Codeview
	*/
	var CodeView = class {
		constructor(context) {
			this.context = context;
			this.$editor = context.layoutInfo.editor;
			this.$editable = context.layoutInfo.editable;
			this.$codable = context.layoutInfo.codable;
			this.$editingArea = context.layoutInfo.editingArea;
			this.options = context.options;
			this.lang = context.options.langInfo;
			this.CodeMirrorConstructor = window.CodeMirror;
			if (this.options.codemirror.CodeMirrorConstructor) this.CodeMirrorConstructor = this.options.codemirror.CodeMirrorConstructor;
			this.handleCloseClick = this.handleCloseClick.bind(this);
		}
		isAirMode() {
			return Boolean(this.options.airMode);
		}
		ensureAirModeCloseButton() {
			if (!this.isAirMode() || !this.options.editing) return null;
			if (!this.$airCodeviewClose || !this.$airCodeviewClose.length) {
				this.removeAirModeCloseButton({ keepCache: true });
				const tooltip = this.lang?.options?.codeview || "Code View";
				this.$airCodeviewClose = $$("<button type=\"button\" class=\"note-air-codeview-close btn btn-outline-secondary btn-sm\" tabindex=\"-1\"></button>").html(this.context.ui.icon(this.options.icons.close)).attr({
					title: tooltip,
					"aria-label": tooltip
				});
				this.$airCodeviewClose.on("click", this.handleCloseClick);
				this.$editingArea.append(this.$airCodeviewClose);
			}
			return this.$airCodeviewClose;
		}
		removeAirModeCloseButton(options = {}) {
			const $button = options.keepCache ? this.$editingArea.find(".note-air-codeview-close") : this.$airCodeviewClose;
			if ($button && $button.length) {
				$button.off("click", this.handleCloseClick);
				$button.remove();
			}
			if (!options.keepCache) this.$airCodeviewClose = null;
		}
		handleCloseClick(event) {
			event.preventDefault();
			if (this.isActivated()) this.toggle();
		}
		sync(html) {
			const isCodeview = this.isActivated();
			const CodeMirror = this.CodeMirrorConstructor;
			if (isCodeview) {
				if (html) if (CodeMirror) this.$codable.data("cmEditor").getDoc().setValue(html);
				else this.$codable.val(html);
				else if (CodeMirror) this.$codable.data("cmEditor").save();
			}
		}
		initialize() {
			this.$codable.on("keyup", (event) => {
				if (event.keyCode === key_default.code.ESCAPE) this.deactivate();
			});
		}
		/**
		* @return {Boolean}
		*/
		isActivated() {
			return this.$editor.hasClass("codeview");
		}
		/**
		* toggle codeview
		*/
		toggle() {
			if (this.isActivated()) this.deactivate();
			else this.activate();
			this.context.triggerEvent("codeview.toggled");
		}
		/**
		* purify input value
		* @param value
		* @returns {*}
		*/
		purify(value) {
			if (this.options.codeviewFilter) {
				value = value.replace(this.options.codeviewFilterRegex, "");
				if (this.options.codeviewIframeFilter) {
					const whitelist = this.options.codeviewIframeWhitelistSrc.concat(this.options.codeviewIframeWhitelistSrcBase);
					value = value.replace(/(<iframe.*?>.*?(?:<\/iframe>)?)/gi, function(tag) {
						if (/<.+src(?==?('|"|\s)?)[\s\S]+src(?=('|"|\s)?)[^>]*?>/i.test(tag)) return "";
						for (const src of whitelist) if (new RegExp("src=\"(https?:)?//" + src.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") + "/(.+)\"").test(tag)) return tag;
						return "";
					});
				}
			}
			return value;
		}
		/**
		* activate code view
		*/
		activate() {
			const CodeMirror = this.CodeMirrorConstructor;
			this.$codable.val(dom_default.html(this.$editable, this.options.prettifyHtml));
			this.$codable.height(this.$editable.height());
			this.context.invoke("toolbar.updateCodeview", true);
			this.context.invoke("airPopover.updateCodeview", true);
			this.$editor.addClass("codeview");
			if (this.isAirMode()) this.ensureAirModeCloseButton();
			this.$codable.trigger("focus");
			if (CodeMirror) {
				const cmEditor = CodeMirror.fromTextArea(this.$codable[0], this.options.codemirror);
				if (this.options.codemirror.tern) {
					const server = new CodeMirror.TernServer(this.options.codemirror.tern);
					cmEditor.ternServer = server;
					cmEditor.on("cursorActivity", (cm) => {
						server.updateArgHints(cm);
					});
				}
				cmEditor.on("blur", (event) => {
					this.context.triggerEvent("blur.codeview", cmEditor.getValue(), event);
				});
				cmEditor.on("change", () => {
					this.context.triggerEvent("change.codeview", cmEditor.getValue(), cmEditor);
				});
				cmEditor.setSize(null, this.$editable.outerHeight());
				this.$codable.data("cmEditor", cmEditor);
			} else {
				this.$codable.on("blur", (event) => {
					this.context.triggerEvent("blur.codeview", this.$codable.val(), event);
				});
				this.$codable.on("input", () => {
					this.context.triggerEvent("change.codeview", this.$codable.val(), this.$codable);
				});
			}
		}
		/**
		* deactivate code view
		*/
		deactivate() {
			if (this.CodeMirrorConstructor) {
				const cmEditor = this.$codable.data("cmEditor");
				this.$codable.val(cmEditor.getValue());
				cmEditor.toTextArea();
			}
			const value = this.purify(dom_default.value(this.$codable, this.options.prettifyHtml) || dom_default.emptyPara);
			const isChange = this.$editable.html() !== value;
			this.$editable.html(value);
			this.$editable.height(this.options.height ? this.$codable.height() : "auto");
			this.$editor.removeClass("codeview");
			this.removeAirModeCloseButton();
			if (isChange) this.context.triggerEvent("change", this.$editable.html(), this.$editable);
			this.$editable.trigger("focus");
			this.context.invoke("toolbar.updateCodeview", false);
			this.context.invoke("airPopover.updateCodeview", false);
		}
		destroy() {
			this.removeAirModeCloseButton();
			if (this.isActivated()) this.deactivate();
		}
	};
	//#endregion
	//#region src/js/module/Statusbar.js
	var EDITABLE_PADDING = 24;
	var Statusbar = class {
		constructor(context) {
			this.$document = $$(document);
			this.$statusbar = context.layoutInfo.statusbar;
			this.$editable = context.layoutInfo.editable;
			this.$codable = context.layoutInfo.codable;
			this.options = context.options;
		}
		initialize() {
			if (this.options.airMode || this.options.disableResizeEditor) {
				this.destroy();
				return;
			}
			this.$statusbar.on("mousedown touchstart", (event) => {
				event.preventDefault();
				event.stopPropagation();
				const editableTop = this.$editable.offset().top - this.$document.scrollTop();
				const editableCodeTop = this.$codable.offset().top - this.$document.scrollTop();
				const onStatusbarMove = (event) => {
					let originalEvent = event.type == "mousemove" ? event : event.originalEvent.touches[0];
					let height = originalEvent.clientY - (editableTop + EDITABLE_PADDING);
					let heightCode = originalEvent.clientY - (editableCodeTop + EDITABLE_PADDING);
					height = this.options.minHeight > 0 ? Math.max(height, this.options.minHeight) : height;
					height = this.options.maxHeight > 0 ? Math.min(height, this.options.maxHeight) : height;
					heightCode = this.options.minHeight > 0 ? Math.max(heightCode, this.options.minHeight) : heightCode;
					heightCode = this.options.maxHeight > 0 ? Math.min(heightCode, this.options.maxHeight) : heightCode;
					this.$editable.height(height);
					this.$codable.height(heightCode);
				};
				this.$document.on("mousemove touchmove", onStatusbarMove).one("mouseup touchend", () => {
					this.$document.off("mousemove touchmove", onStatusbarMove);
				});
			});
		}
		destroy() {
			this.$statusbar.off();
			this.$statusbar.addClass("locked");
		}
	};
	//#endregion
	//#region src/js/module/Fullscreen.js
	var Fullscreen = class {
		constructor(context) {
			this.context = context;
			this.options = context.options;
			this.$editor = context.layoutInfo.editor;
			this.$toolbar = context.layoutInfo.toolbar;
			this.$editable = context.layoutInfo.editable;
			this.$codable = context.layoutInfo.codable;
			this.$statusbar = context.layoutInfo.statusbar;
			this.$statusOutput = this.$editor.find(".note-status-output");
			this.$window = $$(window);
			this.$scrollbar = $$("html, body");
			this.scrollbarClassName = "note-fullscreen-body";
			this.fullscreenPlaceholder = null;
			this.onResize = () => {
				this.resizeTo({ h: this.$window.height() - this.$toolbar.outerHeight() - this.$statusbar.outerHeight() - this.$statusOutput.outerHeight() });
			};
		}
		resizeTo(size) {
			this.$editable.css("height", size.h);
			this.$codable.css("height", size.h);
			if (this.$codable.data("cmeditor")) this.$codable.data("cmeditor").setsize(null, size.h);
		}
		/**
		* toggle fullscreen
		*/
		toggle() {
			if (this.shouldSwitchAirModeFullscreen()) return this.toggleAirModeFullscreen();
			this.toggleEditorFullscreen();
		}
		shouldSwitchAirModeFullscreen() {
			return this.options.airModeFullscreen && (this.options.airMode || this.options.airModeFullscreenProxy && this.isFullscreen());
		}
		captureAirModeState() {
			const currentRange = this.context.invoke("editor.getLastRange");
			const editable = this.context.layoutInfo.editable.get(0);
			return {
				bookmark: currentRange ? currentRange.bookmark(editable) : null,
				shouldRestorePopover: this.context.modules.airPopover?.$popover?.css("display") === "block"
			};
		}
		restoreAirModeState(context, state) {
			if (!state?.bookmark) return;
			const editable = context.layoutInfo.editable.get(0);
			const restoredRange = range_default.createFromBookmark(editable, state.bookmark);
			restoredRange.select();
			context.invoke("editor.setLastRange", restoredRange);
			if (!state.shouldRestorePopover) return;
			const rect = restoredRange.getClientRects()[0];
			const airPopover = context.modules.airPopover;
			if (!rect || !airPopover) return;
			airPopover.pageX = rect.left + window.scrollX;
			airPopover.pageY = rect.top + window.scrollY;
			airPopover.update(true);
		}
		toggleAirModeFullscreen() {
			const nextAirMode = !this.options.airMode;
			const state = this.options.airMode ? this.captureAirModeState() : this.options.airModeFullscreenState;
			const nextContext = this.context.recreate({
				airMode: nextAirMode,
				airModeFullscreen: this.options.airModeFullscreen,
				airModeFullscreenProxy: !nextAirMode,
				airModeFullscreenState: nextAirMode ? null : state,
				focus: false
			});
			if (nextAirMode) {
				this.restoreAirModeState(nextContext, state);
				return;
			}
			nextContext.invoke("fullscreen.toggle");
		}
		toggleEditorFullscreen() {
			this.$editor.toggleClass("fullscreen");
			const isFullscreen = this.isFullscreen();
			this.$scrollbar.toggleClass(this.scrollbarClassName, isFullscreen);
			this.context.invoke("airPopover.hide");
			if (isFullscreen) {
				this.reparentToBody();
				this.$editable.data("orgHeight", this.$editable.css("height"));
				this.$codable.data("orgHeight", this.$codable.css("height"));
				this.$editable.data("orgMaxHeight", this.$editable.css("maxHeight"));
				this.$codable.data("orgMaxHeight", this.$codable.css("maxHeight"));
				this.$editable.css("maxHeight", "");
				this.$codable.css("maxHeight", "");
				this.$window.on("resize", this.onResize).trigger("resize");
			} else {
				this.$window.off("resize", this.onResize);
				this.$editable.css("height", this.$editable.data("orgHeight"));
				this.$codable.css("height", this.$codable.data("orgHeight"));
				this.$editable.css("maxHeight", this.$editable.data("orgMaxHeight"));
				this.$codable.css("maxHeight", this.$codable.data("orgMaxHeight"));
				this.restoreParent();
			}
			this.context.invoke("toolbar.updateFullscreen", isFullscreen);
		}
		reparentToBody() {
			if (this.fullscreenPlaceholder || this.$editor.parent().is("body")) return;
			this.fullscreenPlaceholder = document.createElement("div");
			this.fullscreenPlaceholder.style.display = "none";
			this.fullscreenPlaceholder.setAttribute("data-note-fullscreen-placeholder", "true");
			this.$editor.before(this.fullscreenPlaceholder);
			document.body.appendChild(this.$editor[0]);
		}
		restoreParent() {
			if (!this.fullscreenPlaceholder || !this.fullscreenPlaceholder.parentNode) {
				this.fullscreenPlaceholder = null;
				return;
			}
			this.fullscreenPlaceholder.parentNode.insertBefore(this.$editor[0], this.fullscreenPlaceholder);
			this.fullscreenPlaceholder.parentNode.removeChild(this.fullscreenPlaceholder);
			this.fullscreenPlaceholder = null;
		}
		isFullscreen() {
			return this.$editor.hasClass("fullscreen");
		}
		destroy() {
			this.restoreParent();
			this.$scrollbar.removeClass(this.scrollbarClassName);
		}
	};
	//#endregion
	//#region src/js/module/Handle.js
	var Handle = class {
		constructor(context) {
			this.context = context;
			this.$document = $$(document);
			this.$editingArea = context.layoutInfo.editingArea;
			this.options = context.options;
			this.lang = this.options.langInfo;
			this.events = {
				"summernote.mousedown": (we, e) => {
					if (this.update(e.target, e)) e.preventDefault();
				},
				"summernote.keyup summernote.scroll summernote.change summernote.dialog.shown": () => {
					this.update();
				},
				"summernote.disable": () => {
					this.hide();
				},
				"summernote.blur": (we, event) => {
					if (!this.shouldKeepVisibleOnBlur(event)) this.hide();
				},
				"summernote.codeview.toggled": () => {
					this.update();
				}
			};
		}
		initialize() {
			this.$handle = $$([
				"<div class=\"note-handle\">",
				"<div class=\"note-control-selection\">",
				"<div class=\"note-control-selection-bg\"></div>",
				"<div class=\"note-control-holder note-control-nw\"></div>",
				"<div class=\"note-control-holder note-control-ne\"></div>",
				"<div class=\"note-control-holder note-control-sw\"></div>",
				"<div class=\"",
				this.options.disableResizeImage ? "note-control-holder" : "note-control-sizing",
				" note-control-se\"></div>",
				this.options.disableResizeImage ? "" : "<div class=\"note-control-selection-info\"></div>",
				"</div>",
				"</div>"
			].join("")).prependTo(this.$editingArea);
			this.$handle.on("mousedown", (event) => {
				if (dom_default.isControlSizing(event.target)) {
					event.preventDefault();
					event.stopPropagation();
					const $target = this.$handle.find(".note-control-selection").data("target");
					const posStart = $target.offset();
					const scrollTop = this.$document.scrollTop();
					const onMouseMove = (event) => {
						this.context.invoke("editor.resizeTo", {
							x: event.clientX - posStart.left,
							y: event.clientY - (posStart.top - scrollTop)
						}, $target, !event.shiftKey);
						this.update($target[0], event);
					};
					this.$document.on("mousemove", onMouseMove).one("mouseup", (e) => {
						e.preventDefault();
						this.$document.off("mousemove", onMouseMove);
						this.context.invoke("editor.afterCommand");
					});
					if (!$target.data("ratio")) $target.data("ratio", $target.height() / $target.width());
					return;
				}
				const target = this.resolveMediaTarget(event.target, event);
				if (target) {
					event.preventDefault();
					event.stopPropagation();
					this.update(target, event);
				}
			});
			this.$handle.on("wheel", (event) => {
				event.preventDefault();
				this.update();
			});
		}
		destroy() {
			this.$handle.remove();
		}
		findMediaTargetByPoint(event) {
			const point = event?.originalEvent || event;
			if (typeof point?.clientX !== "number" || typeof point?.clientY !== "number") return null;
			const mediaNodes = this.context.layoutInfo.editable[0]?.querySelectorAll("img, video, iframe.note-video-clip") || [];
			for (const node of mediaNodes) {
				const rect = node.getBoundingClientRect();
				if (point.clientX >= rect.left && point.clientX <= rect.right && point.clientY >= rect.top && point.clientY <= rect.bottom) return node;
			}
			return null;
		}
		resolveMediaTarget(target, event) {
			if (dom_default.isImg(target) || dom_default.isVideoMedia(target)) return target;
			const hitTarget = this.findMediaTargetByPoint(event);
			if (hitTarget) return hitTarget;
			const selectionTarget = this.$handle.find(".note-control-selection").data("target");
			const selectedMedia = selectionTarget && typeof selectionTarget.get === "function" ? selectionTarget.get(0) : selectionTarget;
			if (selectedMedia && (dom_default.isImg(selectedMedia) || dom_default.isVideoMedia(selectedMedia))) {
				if (target instanceof Element && target.closest(".note-control-selection")) return selectedMedia;
				if (this.context.invoke("editor.restoreTarget") === selectedMedia && target instanceof Element && target.closest(".note-handle")) return selectedMedia;
			}
			return null;
		}
		getSelectedMediaTarget() {
			const selectionTarget = this.$handle.find(".note-control-selection").data("target");
			return selectionTarget && typeof selectionTarget.get === "function" ? selectionTarget.get(0) : selectionTarget;
		}
		getBlurRelatedTarget(event) {
			return event?.originalEvent?.relatedTarget || event?.relatedTarget || null;
		}
		shouldKeepVisibleOnBlur(event) {
			const relatedTarget = this.getBlurRelatedTarget(event);
			const selectedMedia = this.getSelectedMediaTarget();
			if (!(relatedTarget instanceof Element)) return false;
			if (this.$handle[0]?.contains(relatedTarget)) return true;
			if (relatedTarget.closest(".note-image-popover, .note-video-popover, .note-link-popover, .note-table-popover")) return true;
			return Boolean(selectedMedia && (relatedTarget === selectedMedia || selectedMedia.contains?.(relatedTarget)));
		}
		update(target, event) {
			if (this.context.isDisabled()) return false;
			const mediaTarget = this.resolveMediaTarget(target, event);
			const isMedia = !!mediaTarget;
			const $selection = this.$handle.find(".note-control-selection");
			this.context.invoke("imagePopover.update", mediaTarget || target, event);
			this.context.invoke("videoPopover.update", mediaTarget || target, event);
			if (isMedia) {
				const $media = $$(mediaTarget);
				$$(".note-video-clip").not((_, node) => node === mediaTarget).removeClass("note-video-interactive");
				const areaRect = this.$editingArea[0].getBoundingClientRect();
				const mediaRect = mediaTarget.getBoundingClientRect();
				$selection.css({
					display: "block",
					left: mediaRect.left - areaRect.left,
					top: mediaRect.top - areaRect.top,
					width: mediaRect.width,
					height: mediaRect.height
				}).data("target", $media);
				let sizingText = `${mediaRect.width}x${mediaRect.height}`;
				if (dom_default.isImg(mediaTarget)) {
					const origImageObj = new Image();
					origImageObj.src = $media.attr("src");
					sizingText += ` (${this.lang.image.original}: ${origImageObj.width}x${origImageObj.height})`;
				}
				$selection.find(".note-control-selection-info").text(sizingText);
				this.context.invoke("editor.saveTarget", mediaTarget);
			} else this.hide();
			return isMedia;
		}
		/**
		* hide
		*/
		hide() {
			$$(".note-video-clip").removeClass("note-video-interactive");
			this.context.invoke("editor.clearTarget");
			this.$handle.children().hide();
		}
	};
	//#endregion
	//#region src/js/module/AutoLink.js
	var defaultScheme = "http://";
	var linkPattern = /^([A-Za-z][A-Za-z0-9+-.]*\:[\/]{2}|tel:|mailto:[A-Z0-9._%+-]+@|xmpp:[A-Z0-9._%+-]+@)?(www\.)?(.+)$/i;
	var AutoLink = class {
		constructor(context) {
			this.context = context;
			this.options = context.options;
			this.$editable = context.layoutInfo.editable;
			this.events = {
				"summernote.keyup": (we, event) => {
					if (!event.isDefaultPrevented()) this.handleKeyup(event);
				},
				"summernote.keydown": (we, event) => {
					this.handleKeydown(event);
				}
			};
		}
		initialize() {
			this.lastWordRange = null;
		}
		destroy() {
			this.lastWordRange = null;
		}
		replace() {
			if (!this.lastWordRange) return;
			const keyword = this.lastWordRange.toString();
			const match = keyword.match(linkPattern);
			if (match && (match[1] || match[2])) {
				const link = match[1] ? keyword : defaultScheme + keyword;
				const urlText = this.options.showDomainOnlyForAutolink ? keyword.replace(/^(?:https?:\/\/)?(?:tel?:?)?(?:mailto?:?)?(?:xmpp?:?)?(?:www\.)?/i, "").split("/")[0] : keyword;
				const node = $$("<a></a>").html(urlText).attr("href", link)[0];
				if (this.context.options.linkTargetBlank) $$(node).attr("target", "_blank");
				this.lastWordRange.insertNode(node);
				this.lastWordRange = null;
				this.context.invoke("editor.focus");
				this.context.triggerEvent("change", this.$editable.html(), this.$editable);
			}
		}
		handleKeydown(event) {
			if (lists_default.contains([key_default.code.ENTER, key_default.code.SPACE], event.keyCode)) {
				const wordRange = this.context.invoke("editor.createRange").getWordRange();
				this.lastWordRange = wordRange;
			}
		}
		handleKeyup(event) {
			if (key_default.code.SPACE === event.keyCode || key_default.code.ENTER === event.keyCode && !event.shiftKey) this.replace();
		}
	};
	//#endregion
	//#region src/js/module/AutoSync.js
	/**
	* textarea auto sync.
	*/
	var AutoSync = class {
		constructor(context) {
			this.$note = context.layoutInfo.note;
			this.events = { "summernote.change": () => {
				this.$note.val(context.invoke("code"));
			} };
		}
		shouldInitialize() {
			return dom_default.isTextarea(this.$note[0]);
		}
	};
	//#endregion
	//#region src/js/module/AutoReplace.js
	var AutoReplace = class {
		constructor(context) {
			this.context = context;
			this.options = context.options.replace || {};
			this.keys = [
				key_default.code.ENTER,
				key_default.code.SPACE,
				key_default.code.PERIOD,
				key_default.code.COMMA,
				key_default.code.SEMICOLON,
				key_default.code.SLASH
			];
			this.previousKeydownCode = null;
			this.events = {
				"summernote.keyup": (we, event) => {
					if (!event.isDefaultPrevented()) this.handleKeyup(event);
				},
				"summernote.keydown": (we, event) => {
					this.handleKeydown(event);
				}
			};
		}
		shouldInitialize() {
			return !!this.options.match;
		}
		initialize() {
			this.lastWord = null;
		}
		destroy() {
			this.lastWord = null;
		}
		replace() {
			if (!this.lastWord) return;
			const self = this;
			const keyword = this.lastWord.toString();
			this.options.match(keyword, function(match) {
				if (match) {
					let node = "";
					if (typeof match === "string") node = dom_default.createText(match);
					else if (match instanceof DomQuery) node = match.get(0);
					else if (match instanceof Node) node = match;
					if (!node) return;
					self.lastWord.insertNode(node);
					self.lastWord = null;
					self.context.invoke("editor.focus");
				}
			});
		}
		handleKeydown(event) {
			if (this.previousKeydownCode && lists_default.contains(this.keys, this.previousKeydownCode)) {
				this.previousKeydownCode = event.keyCode;
				return;
			}
			if (lists_default.contains(this.keys, event.keyCode)) {
				const wordRange = this.context.invoke("editor.createRange").getWordRange();
				this.lastWord = wordRange;
			}
			this.previousKeydownCode = event.keyCode;
		}
		handleKeyup(event) {
			if (lists_default.contains(this.keys, event.keyCode)) this.replace();
		}
	};
	//#endregion
	//#region src/js/module/Placeholder.js
	var Placeholder = class {
		constructor(context) {
			this.context = context;
			this.$editingArea = context.layoutInfo.editingArea;
			this.options = context.options;
			if (this.options.inheritPlaceholder === true) this.options.placeholder = this.context.$note.attr("placeholder") || this.options.placeholder;
			this.events = {
				"summernote.init summernote.change": () => {
					this.update();
				},
				"summernote.codeview.toggled": () => {
					this.update();
				}
			};
		}
		shouldInitialize() {
			return !!this.options.placeholder;
		}
		initialize() {
			this.$placeholder = $$("<div class=\"note-placeholder\"></div>");
			this.$placeholder.on("click", () => {
				this.context.invoke("focus");
			}).html(this.options.placeholder).prependTo(this.$editingArea);
			this.update();
		}
		destroy() {
			this.$placeholder.remove();
		}
		update() {
			const isShow = !this.context.invoke("codeview.isActivated") && this.context.invoke("editor.isEmpty");
			this.$placeholder.toggle(isShow);
		}
	};
	//#endregion
	//#region src/js/module/Buttons.js
	var BOOTSTRAP_BUTTON_SIZE_CLASSES = new Set(["btn-sm", "btn-lg"]);
	var BOOTSTRAP_BUTTON_GROUP_SIZE_CLASSES = new Set(["btn-group-sm", "btn-group-lg"]);
	var BOOTSTRAP_BUTTON_STYLE_CLASS_PATTERN = /^btn(?:-outline)?-[a-z0-9-]+$/;
	var Buttons = class {
		constructor(context) {
			this.ui = $$.summernote.ui;
			this.context = context;
			this.$toolbar = context.layoutInfo.toolbar;
			this.options = context.options;
			this.lang = this.options.langInfo;
			this.invertedKeyMap = func_default.invertObject(this.options.keyMap[env_default.isMac ? "mac" : "pc"]);
			this.fontInstalledMap = /* @__PURE__ */ new Map();
			this.fontNamesIgnoreCheck = new Set(this.options.fontNamesIgnoreCheck.map((name) => name.toLowerCase()));
			this.supportedStyleTags = new Set(this.options.styleTags.map((styleTag) => this.getStyleTagValue(styleTag).toLowerCase()));
		}
		representShortcut(editorMethod) {
			let shortcut = this.invertedKeyMap[editorMethod];
			if (!this.options.shortcuts || !shortcut) return "";
			if (env_default.isMac) shortcut = shortcut.replace("CMD", "⌘").replace("SHIFT", "⇧");
			shortcut = shortcut.replace("BACKSLASH", "\\").replace("SLASH", "/").replace("LEFTBRACKET", "[").replace("RIGHTBRACKET", "]");
			return " (" + shortcut + ")";
		}
		button(o) {
			if (!this.options.tooltip && o.tooltip) delete o.tooltip;
			o.container = this.options.container;
			return this.ui.button(o);
		}
		initialize() {
			this.addToolbarButtons();
			this.addImagePopoverButtons();
			this.addVideoPopoverButtons();
			this.addLinkPopoverButtons();
			this.addTablePopoverButtons();
		}
		destroy() {
			this.fontInstalledMap.clear();
			this.fontNamesIgnoreCheck.clear();
			this.supportedStyleTags.clear();
		}
		isFontInstalled(name) {
			const normalizedName = name.toLowerCase();
			if (!this.fontInstalledMap.has(normalizedName)) this.fontInstalledMap.set(normalizedName, env_default.isFontInstalled(name) || this.fontNamesIgnoreCheck.has(normalizedName));
			return this.fontInstalledMap.get(normalizedName);
		}
		isFontDeservedToAdd(name) {
			name = name.toLowerCase();
			return name !== "" && this.isFontInstalled(name) && env_default.genericFontFamilies.indexOf(name) === -1;
		}
		getStyleTagValue(styleTag) {
			if (typeof styleTag === "string") return styleTag;
			return styleTag.value || styleTag.tag || "";
		}
		getCurrentStyleTag(styleInfo) {
			const currentStyleNode = (styleInfo.ancestors || []).find((node) => {
				return this.supportedStyleTags.has(node.nodeName.toLowerCase());
			});
			return currentStyleNode ? currentStyleNode.nodeName.toLowerCase() : null;
		}
		normalizeLineHeight(value) {
			const numericValue = parseFloat(value);
			return Number.isNaN(numericValue) ? value + "" : numericValue.toFixed(1);
		}
		normalizeFontFamilyName(name) {
			return name.replace(/[\'\"]/g, "").trim();
		}
		normalizeClassNames(classNames) {
			return typeof classNames === "string" ? classNames.split(/\s+/).filter(Boolean) : [];
		}
		isBootstrapButtonStyleClass(className) {
			return className !== "btn" && BOOTSTRAP_BUTTON_STYLE_CLASS_PATTERN.test(className) && !BOOTSTRAP_BUTTON_SIZE_CLASSES.has(className);
		}
		applyContainerButtonClassNames($container, classPrefix) {
			const containerClassNames = this.normalizeClassNames(this.options[`${classPrefix}ClassName`]);
			const buttonClassNames = this.normalizeClassNames(this.options[`${classPrefix}ButtonClassName`]);
			const groupClassNames = this.normalizeClassNames(this.options[`${classPrefix}ButtonGroupClassName`]);
			const useNativeButtonGroups = Boolean(this.options[`${classPrefix}UseNativeButtonGroups`]);
			const shouldDropDefaultButtonSize = useNativeButtonGroups || groupClassNames.some((className) => BOOTSTRAP_BUTTON_GROUP_SIZE_CLASSES.has(className));
			const $targetContainer = classPrefix === "popover" ? $container.closest(".note-popover").length ? $container.closest(".note-popover") : $container : $container;
			if (containerClassNames.length) {
				$targetContainer.addClass(containerClassNames.join(" "));
				if (classPrefix === "popover") $container.addClass(containerClassNames.join(" "));
			}
			const $buttonGroups = $container.children(".note-btn-group");
			if (useNativeButtonGroups) {
				$container.addClass("btn-toolbar");
				$buttonGroups.attr("role", "group");
			}
			if (groupClassNames.length) $buttonGroups.addClass(groupClassNames.join(" "));
			if (!buttonClassNames.length && !shouldDropDefaultButtonSize) return;
			const customSizeClassNames = buttonClassNames.filter((className) => BOOTSTRAP_BUTTON_SIZE_CLASSES.has(className));
			const customStyleClassNames = buttonClassNames.filter((className) => this.isBootstrapButtonStyleClass(className));
			$container.find(".note-btn").each((_, button) => {
				const classNames = Array.from(button.classList);
				if (customStyleClassNames.length) {
					const styleClassNames = classNames.filter((className) => this.isBootstrapButtonStyleClass(className));
					if (styleClassNames.length) button.classList.remove(...styleClassNames);
				}
				if (customSizeClassNames.length || shouldDropDefaultButtonSize) {
					const sizeClassNames = classNames.filter((className) => BOOTSTRAP_BUTTON_SIZE_CLASSES.has(className));
					if (sizeClassNames.length) button.classList.remove(...sizeClassNames);
				}
				if (buttonClassNames.length) button.classList.add(...buttonClassNames);
			});
		}
		updateDropdownChecks($container, selector, predicate) {
			$container.find(selector).each((idx, item) => {
				const $item = $$(item);
				$item.toggleClass("checked", predicate($item));
			});
		}
		colorPalette(className, tooltip, backColor, foreColor) {
			return this.ui.buttonGroup({
				className: "note-color " + className,
				children: [
					this.button({
						className: "note-current-color-button",
						contents: this.ui.icon(this.options.icons.font + " note-recent-color"),
						tooltip,
						click: (event) => {
							const $button = $$(event.currentTarget);
							if (backColor && foreColor) this.context.invoke("editor.color", {
								backColor: $button.attr("data-backColor"),
								foreColor: $button.attr("data-foreColor")
							});
							else if (backColor) this.context.invoke("editor.color", { backColor: $button.attr("data-backColor") });
							else if (foreColor) this.context.invoke("editor.color", { foreColor: $button.attr("data-foreColor") });
						},
						callback: ($button) => {
							const $recentColor = $button.find(".note-recent-color");
							if (backColor) {
								$recentColor.css("background-color", this.options.colorButton.backColor);
								$button.attr("data-backColor", this.options.colorButton.backColor);
							}
							if (foreColor) {
								$recentColor.css("color", this.options.colorButton.foreColor);
								$button.attr("data-foreColor", this.options.colorButton.foreColor);
							} else $recentColor.css("color", "transparent");
						}
					}),
					this.button({
						className: "dropdown-toggle",
						contents: this.ui.dropdownButtonContents("", this.options),
						tooltip: this.lang.color.more,
						data: { toggle: "dropdown" }
					}),
					this.ui.dropdown({
						items: (backColor ? [
							"<div class=\"note-palette\">",
							"<div class=\"note-palette-title\">" + this.lang.color.background + "</div>",
							"<div>",
							"<button type=\"button\" class=\"note-color-reset btn btn-light btn-default\" data-event=\"backColor\" data-value=\"transparent\">",
							this.lang.color.transparent,
							"</button>",
							"</div>",
							"<div class=\"note-holder\" data-event=\"backColor\"><!-- back colors --></div>",
							"<div>",
							"<button type=\"button\" class=\"note-color-select btn btn-light btn-default\" data-event=\"openPalette\" data-value=\"backColorPicker-" + this.options.id + "\">",
							this.lang.color.cpSelect,
							"</button>",
							"<input type=\"color\" id=\"backColorPicker-" + this.options.id + "\" class=\"note-btn note-color-select-btn\" value=\"" + this.options.colorButton.backColor + "\" data-event=\"backColorPalette-" + this.options.id + "\">",
							"</div>",
							"<div class=\"note-holder-custom\" id=\"backColorPalette-" + this.options.id + "\" data-event=\"backColor\"></div>",
							"</div>"
						].join("") : "") + (foreColor ? [
							"<div class=\"note-palette\">",
							"<div class=\"note-palette-title\">" + this.lang.color.foreground + "</div>",
							"<div>",
							"<button type=\"button\" class=\"note-color-reset btn btn-light btn-default\" data-event=\"removeFormat\" data-value=\"foreColor\">",
							this.lang.color.resetToDefault,
							"</button>",
							"</div>",
							"<div class=\"note-holder\" data-event=\"foreColor\"><!-- fore colors --></div>",
							"<div>",
							"<button type=\"button\" class=\"note-color-select btn btn-light btn-default\" data-event=\"openPalette\" data-value=\"foreColorPicker-" + this.options.id + "\">",
							this.lang.color.cpSelect,
							"</button>",
							"<input type=\"color\" id=\"foreColorPicker-" + this.options.id + "\" class=\"note-btn note-color-select-btn\" value=\"" + this.options.colorButton.foreColor + "\" data-event=\"foreColorPalette-" + this.options.id + "\">",
							"</div>",
							"<div class=\"note-holder-custom\" id=\"foreColorPalette-" + this.options.id + "\" data-event=\"foreColor\"></div>",
							"</div>"
						].join("") : ""),
						callback: ($dropdown) => {
							$dropdown.find(".note-holder").each((idx, item) => {
								const $holder = $$(item);
								$holder.append(this.ui.palette({
									colors: this.options.colors,
									colorsName: this.options.colorsName,
									eventName: $holder.data("event"),
									container: this.options.container,
									tooltip: this.options.tooltip
								}).render());
							});
							var customColors = [[
								"#FFFFFF",
								"#FFFFFF",
								"#FFFFFF",
								"#FFFFFF",
								"#FFFFFF",
								"#FFFFFF",
								"#FFFFFF",
								"#FFFFFF"
							]];
							$dropdown.find(".note-holder-custom").each((idx, item) => {
								const $holder = $$(item);
								$holder.append(this.ui.palette({
									colors: customColors,
									colorsName: customColors,
									eventName: $holder.data("event"),
									container: this.options.container,
									tooltip: this.options.tooltip
								}).render());
							});
							$dropdown.find("input[type=color]").each((idx, item) => {
								$$(item).on("change", function() {
									const $chip = $dropdown.find("#" + $$(this).data("event")).find(".note-color-btn").first();
									const color = this.value.toUpperCase();
									$chip.css("background-color", color).attr("title", color).attr("aria-label", color).attr("data-value", color).attr("data-bs-original-title", color);
									$chip.trigger("click");
								});
							});
						},
						click: (event) => {
							const $parent = $$("." + className).find(".note-dropdown-menu");
							const $button = $$(event.target);
							const eventName = $button.data("event");
							const value = $button.attr("data-value");
							if (eventName === "openPalette") {
								const $picker = $parent.find("#" + value);
								const $palette = $$($parent.find("#" + $picker.data("event")).find(".note-color-row")[0]);
								const $chip = $palette.find(".note-color-btn").last().detach();
								const color = $picker.val();
								$chip.css("background-color", color).attr("title", color).attr("aria-label", color).attr("data-value", color).attr("data-bs-original-title", color);
								$palette.prepend($chip);
								$picker.trigger("click");
							} else {
								if (lists_default.contains(["backColor", "foreColor"], eventName)) {
									const key = eventName === "backColor" ? "background-color" : "color";
									const $color = $button.closest(".note-color").find(".note-recent-color");
									const $currentButton = $button.closest(".note-color").find(".note-current-color-button");
									$color.css(key, value);
									$currentButton.attr("data-" + eventName, value);
								}
								this.context.invoke("editor." + eventName, value);
							}
						}
					})
				]
			}).render();
		}
		addToolbarButtons() {
			this.context.memo("button.style", () => {
				return this.ui.buttonGroup([this.button({
					className: "dropdown-toggle",
					contents: this.ui.dropdownButtonContents(this.ui.icon(this.options.icons.magic), this.options),
					tooltip: this.lang.style.style,
					data: { toggle: "dropdown" }
				}), this.ui.dropdownCheck({
					className: "dropdown-style",
					checkClassName: this.options.icons.menuCheck,
					items: this.options.styleTags,
					title: this.lang.style.style,
					template: (item) => {
						if (typeof item === "string") item = {
							tag: item,
							title: Object.prototype.hasOwnProperty.call(this.lang.style, item) ? this.lang.style[item] : item
						};
						const tag = item.tag;
						const title = item.title;
						const style = item.style ? " style=\"" + item.style + "\" " : "";
						const className = item.className ? " class=\"" + item.className + "\"" : "";
						return "<" + tag + style + className + ">" + title + "</" + tag + ">";
					},
					click: this.context.createInvokeHandlerAndUpdateState("editor.formatBlock")
				})]).render();
			});
			for (let styleIdx = 0, styleLen = this.options.styleTags.length; styleIdx < styleLen; styleIdx++) {
				const item = this.options.styleTags[styleIdx];
				this.context.memo("button.style." + item, () => {
					return this.button({
						className: "note-btn-style-" + item,
						contents: "<div data-value=\"" + item + "\">" + item.toUpperCase() + "</div>",
						tooltip: this.lang.style[item],
						click: this.context.createInvokeHandler("editor.formatBlock")
					}).render();
				});
			}
			this.context.memo("button.bold", () => {
				return this.button({
					className: "note-btn-bold",
					contents: this.ui.icon(this.options.icons.bold),
					tooltip: this.lang.font.bold + this.representShortcut("bold"),
					click: this.context.createInvokeHandlerAndUpdateState("editor.bold")
				}).render();
			});
			this.context.memo("button.italic", () => {
				return this.button({
					className: "note-btn-italic",
					contents: this.ui.icon(this.options.icons.italic),
					tooltip: this.lang.font.italic + this.representShortcut("italic"),
					click: this.context.createInvokeHandlerAndUpdateState("editor.italic")
				}).render();
			});
			this.context.memo("button.underline", () => {
				return this.button({
					className: "note-btn-underline",
					contents: this.ui.icon(this.options.icons.underline),
					tooltip: this.lang.font.underline + this.representShortcut("underline"),
					click: this.context.createInvokeHandlerAndUpdateState("editor.underline")
				}).render();
			});
			this.context.memo("button.clear", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.eraser),
					tooltip: this.lang.font.clear + this.representShortcut("removeFormat"),
					click: this.context.createInvokeHandler("editor.removeFormat")
				}).render();
			});
			this.context.memo("button.strikethrough", () => {
				return this.button({
					className: "note-btn-strikethrough",
					contents: this.ui.icon(this.options.icons.strikethrough),
					tooltip: this.lang.font.strikethrough + this.representShortcut("strikethrough"),
					click: this.context.createInvokeHandlerAndUpdateState("editor.strikethrough")
				}).render();
			});
			this.context.memo("button.superscript", () => {
				return this.button({
					className: "note-btn-superscript",
					contents: this.ui.icon(this.options.icons.superscript),
					tooltip: this.lang.font.superscript,
					click: this.context.createInvokeHandlerAndUpdateState("editor.superscript")
				}).render();
			});
			this.context.memo("button.subscript", () => {
				return this.button({
					className: "note-btn-subscript",
					contents: this.ui.icon(this.options.icons.subscript),
					tooltip: this.lang.font.subscript,
					click: this.context.createInvokeHandlerAndUpdateState("editor.subscript")
				}).render();
			});
			this.context.memo("button.fontname", () => {
				const styleInfo = this.context.invoke("editor.currentStyle");
				if (this.options.addDefaultFonts) $$.each(styleInfo["font-family"].split(","), (idx, fontname) => {
					fontname = fontname.trim().replace(/['"]+/g, "");
					if (this.isFontDeservedToAdd(fontname)) {
						if (this.options.fontNames.indexOf(fontname) === -1) this.options.fontNames.push(fontname);
					}
				});
				return this.ui.buttonGroup([this.button({
					className: "dropdown-toggle",
					contents: this.ui.dropdownButtonContents("<span class=\"note-current-fontname\"></span>", this.options),
					tooltip: this.lang.font.name,
					data: { toggle: "dropdown" }
				}), this.ui.dropdownCheck({
					className: "dropdown-fontname",
					checkClassName: this.options.icons.menuCheck,
					items: this.options.fontNames.filter(this.isFontInstalled.bind(this)),
					title: this.lang.font.name,
					template: (item) => {
						return "<span style=\"font-family: " + env_default.validFontName(item) + "\">" + item + "</span>";
					},
					click: this.context.createInvokeHandlerAndUpdateState("editor.fontName")
				})]).render();
			});
			this.context.memo("button.fontsize", () => {
				return this.ui.buttonGroup([this.button({
					className: "dropdown-toggle",
					contents: this.ui.dropdownButtonContents("<span class=\"note-current-fontsize\"></span>", this.options),
					tooltip: this.lang.font.size,
					data: { toggle: "dropdown" }
				}), this.ui.dropdownCheck({
					className: "dropdown-fontsize",
					checkClassName: this.options.icons.menuCheck,
					items: this.options.fontSizes,
					title: this.lang.font.size,
					click: this.context.createInvokeHandlerAndUpdateState("editor.fontSize")
				})]).render();
			});
			this.context.memo("button.fontsizeunit", () => {
				return this.ui.buttonGroup([this.button({
					className: "dropdown-toggle",
					contents: this.ui.dropdownButtonContents("<span class=\"note-current-fontsizeunit\"></span>", this.options),
					tooltip: this.lang.font.sizeunit,
					data: { toggle: "dropdown" }
				}), this.ui.dropdownCheck({
					className: "dropdown-fontsizeunit",
					checkClassName: this.options.icons.menuCheck,
					items: this.options.fontSizeUnits,
					title: this.lang.font.sizeunit,
					click: this.context.createInvokeHandlerAndUpdateState("editor.fontSizeUnit")
				})]).render();
			});
			this.context.memo("button.color", () => {
				return this.colorPalette("note-color-all", this.lang.color.recent, true, true);
			});
			this.context.memo("button.forecolor", () => {
				return this.colorPalette("note-color-fore", this.lang.color.foreground, false, true);
			});
			this.context.memo("button.backcolor", () => {
				return this.colorPalette("note-color-back", this.lang.color.background, true, false);
			});
			this.context.memo("button.ul", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.unorderedlist),
					tooltip: this.lang.lists.unordered + this.representShortcut("insertUnorderedList"),
					click: this.context.createInvokeHandler("editor.insertUnorderedList")
				}).render();
			});
			this.context.memo("button.ol", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.orderedlist),
					tooltip: this.lang.lists.ordered + this.representShortcut("insertOrderedList"),
					click: this.context.createInvokeHandler("editor.insertOrderedList")
				}).render();
			});
			const justifyLeft = this.button({
				contents: this.ui.icon(this.options.icons.alignLeft),
				tooltip: this.lang.paragraph.left + this.representShortcut("justifyLeft"),
				click: this.context.createInvokeHandler("editor.justifyLeft")
			});
			const justifyCenter = this.button({
				contents: this.ui.icon(this.options.icons.alignCenter),
				tooltip: this.lang.paragraph.center + this.representShortcut("justifyCenter"),
				click: this.context.createInvokeHandler("editor.justifyCenter")
			});
			const justifyRight = this.button({
				contents: this.ui.icon(this.options.icons.alignRight),
				tooltip: this.lang.paragraph.right + this.representShortcut("justifyRight"),
				click: this.context.createInvokeHandler("editor.justifyRight")
			});
			const justifyFull = this.button({
				contents: this.ui.icon(this.options.icons.alignJustify),
				tooltip: this.lang.paragraph.justify + this.representShortcut("justifyFull"),
				click: this.context.createInvokeHandler("editor.justifyFull")
			});
			const outdent = this.button({
				contents: this.ui.icon(this.options.icons.outdent),
				tooltip: this.lang.paragraph.outdent + this.representShortcut("outdent"),
				click: this.context.createInvokeHandler("editor.outdent")
			});
			const indent = this.button({
				contents: this.ui.icon(this.options.icons.indent),
				tooltip: this.lang.paragraph.indent + this.representShortcut("indent"),
				click: this.context.createInvokeHandler("editor.indent")
			});
			this.context.memo("button.justifyLeft", func_default.invoke(justifyLeft, "render"));
			this.context.memo("button.justifyCenter", func_default.invoke(justifyCenter, "render"));
			this.context.memo("button.justifyRight", func_default.invoke(justifyRight, "render"));
			this.context.memo("button.justifyFull", func_default.invoke(justifyFull, "render"));
			this.context.memo("button.outdent", func_default.invoke(outdent, "render"));
			this.context.memo("button.indent", func_default.invoke(indent, "render"));
			this.context.memo("button.paragraph", () => {
				return this.ui.buttonGroup([this.button({
					className: "dropdown-toggle",
					contents: this.ui.dropdownButtonContents(this.ui.icon(this.options.icons.alignLeft), this.options),
					tooltip: this.lang.paragraph.paragraph,
					data: { toggle: "dropdown" }
				}), this.ui.dropdown([this.ui.buttonGroup({
					className: "note-align",
					children: [
						justifyLeft,
						justifyCenter,
						justifyRight,
						justifyFull
					]
				}), this.ui.buttonGroup({
					className: "note-list",
					children: [outdent, indent]
				})])]).render();
			});
			this.context.memo("button.height", () => {
				return this.ui.buttonGroup([this.button({
					className: "dropdown-toggle",
					contents: this.ui.dropdownButtonContents(this.ui.icon(this.options.icons.textHeight), this.options),
					tooltip: this.lang.font.height,
					data: { toggle: "dropdown" }
				}), this.ui.dropdownCheck({
					items: this.options.lineHeights,
					checkClassName: this.options.icons.menuCheck,
					className: "dropdown-line-height",
					title: this.lang.font.height,
					click: this.context.createInvokeHandlerAndUpdateState("editor.lineHeight")
				})]).render();
			});
			this.context.memo("button.table", () => {
				return this.ui.buttonGroup([this.button({
					className: "dropdown-toggle",
					contents: this.ui.dropdownButtonContents(this.ui.icon(this.options.icons.table), this.options),
					tooltip: this.lang.table.table,
					data: { toggle: "dropdown" }
				}), this.ui.dropdown({
					title: this.lang.table.table,
					className: "note-table",
					items: [
						"<div class=\"note-dimension-picker\">",
						"<div class=\"note-dimension-picker-mousecatcher\" data-event=\"insertTable\" data-value=\"1x1\"></div>",
						"<div class=\"note-dimension-picker-highlighted\"></div>",
						"<div class=\"note-dimension-picker-unhighlighted\"></div>",
						"</div>",
						"<div class=\"note-dimension-display\">1 x 1</div>"
					].join("")
				})], { callback: ($node) => {
					const $catcher = $node.find(".note-dimension-picker-mousecatcher");
					const insertTable = (event) => {
						event.preventDefault();
						this.context.invoke("editor.restoreRange");
						this.context.invoke("editor.insertTable", $$(event.currentTarget).data("value"));
					};
					$catcher.css({
						width: this.options.insertTableMaxSize.col + "em",
						height: this.options.insertTableMaxSize.row + "em"
					}).on("mousedown", (event) => {
						event.preventDefault();
					}).on("mouseup", insertTable).on("mousemove", this.tableMoveHandler.bind(this));
				} }).render();
			});
			this.context.memo("button.link", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.link),
					tooltip: this.lang.link.link + this.representShortcut("linkDialog.show"),
					click: this.context.createInvokeHandler("linkDialog.show")
				}).render();
			});
			this.context.memo("button.picture", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.picture),
					tooltip: this.lang.image.image,
					click: this.context.createInvokeHandler("imageDialog.show")
				}).render();
			});
			this.context.memo("button.video", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.video),
					tooltip: this.lang.video.video,
					click: this.context.createInvokeHandler("videoDialog.show")
				}).render();
			});
			this.context.memo("button.hr", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.minus),
					tooltip: this.lang.hr.insert + this.representShortcut("insertHorizontalRule"),
					click: this.context.createInvokeHandler("editor.insertHorizontalRule")
				}).render();
			});
			this.context.memo("button.fullscreen", () => {
				return this.button({
					className: "btn-fullscreen note-codeview-keep",
					contents: this.ui.icon(this.options.icons.arrowsAlt),
					tooltip: this.lang.options.fullscreen,
					click: this.context.createInvokeHandler("fullscreen.toggle")
				}).render();
			});
			this.context.memo("button.codeview", () => {
				return this.button({
					className: "btn-codeview note-codeview-keep",
					contents: this.ui.icon(this.options.icons.code),
					tooltip: this.lang.options.codeview,
					click: this.context.createInvokeHandler("codeview.toggle")
				}).render();
			});
			this.context.memo("button.redo", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.redo),
					tooltip: this.lang.history.redo + this.representShortcut("redo"),
					click: this.context.createInvokeHandler("editor.redo")
				}).render();
			});
			this.context.memo("button.undo", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.undo),
					tooltip: this.lang.history.undo + this.representShortcut("undo"),
					click: this.context.createInvokeHandler("editor.undo")
				}).render();
			});
			this.context.memo("button.help", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.question),
					tooltip: this.lang.options.help,
					click: this.context.createInvokeHandler("helpDialog.show")
				}).render();
			});
		}
		/**
		* image: [
		*   ['imageResize', ['resizeFull', 'resizeHalf', 'resizeQuarter', 'resizeNone']],
		*   ['float', ['floatLeft', 'floatRight', 'floatNone']],
		*   ['remove', ['removeMedia']],
		* ],
		*/
		addImagePopoverButtons() {
			this.context.memo("button.resizeFull", () => {
				return this.button({
					contents: "<span class=\"note-fontsize-10\">100%</span>",
					tooltip: this.lang.image.resizeFull,
					click: this.context.createInvokeHandler("editor.resize", "1")
				}).render();
			});
			this.context.memo("button.resizeHalf", () => {
				return this.button({
					contents: "<span class=\"note-fontsize-10\">50%</span>",
					tooltip: this.lang.image.resizeHalf,
					click: this.context.createInvokeHandler("editor.resize", "0.5")
				}).render();
			});
			this.context.memo("button.resizeQuarter", () => {
				return this.button({
					contents: "<span class=\"note-fontsize-10\">25%</span>",
					tooltip: this.lang.image.resizeQuarter,
					click: this.context.createInvokeHandler("editor.resize", "0.25")
				}).render();
			});
			this.context.memo("button.resizeNone", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.rollback),
					tooltip: this.lang.image.resizeNone,
					click: this.context.createInvokeHandler("editor.resize", "0")
				}).render();
			});
			this.context.memo("button.floatLeft", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.floatLeft),
					tooltip: this.lang.image.floatLeft,
					click: this.context.createInvokeHandler("editor.floatMe", "left")
				}).render();
			});
			this.context.memo("button.floatRight", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.floatRight),
					tooltip: this.lang.image.floatRight,
					click: this.context.createInvokeHandler("editor.floatMe", "right")
				}).render();
			});
			this.context.memo("button.floatNone", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.rollback),
					tooltip: this.lang.image.floatNone,
					click: this.context.createInvokeHandler("editor.floatMe", "none")
				}).render();
			});
			this.context.memo("button.removeMedia", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.trash),
					tooltip: this.lang.image.remove,
					click: this.context.createInvokeHandler("editor.removeMedia")
				}).render();
			});
		}
		addLinkPopoverButtons() {
			this.context.memo("button.linkDialogShow", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.link),
					tooltip: this.lang.link.edit,
					click: this.context.createInvokeHandler("linkDialog.show")
				}).render();
			});
			this.context.memo("button.unlink", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.unlink),
					tooltip: this.lang.link.unlink,
					click: this.context.createInvokeHandler("editor.unlink")
				}).render();
			});
		}
		addVideoPopoverButtons() {
			this.context.memo("button.resizeFullVideo", () => {
				return this.button({
					contents: "<span class=\"note-fontsize-10\">100%</span>",
					tooltip: this.lang.video.resizeFull,
					click: this.context.createInvokeHandler("editor.resize", "1")
				}).render();
			});
			this.context.memo("button.resizeHalfVideo", () => {
				return this.button({
					contents: "<span class=\"note-fontsize-10\">50%</span>",
					tooltip: this.lang.video.resizeHalf,
					click: this.context.createInvokeHandler("editor.resize", "0.5")
				}).render();
			});
			this.context.memo("button.resizeQuarterVideo", () => {
				return this.button({
					contents: "<span class=\"note-fontsize-10\">25%</span>",
					tooltip: this.lang.video.resizeQuarter,
					click: this.context.createInvokeHandler("editor.resize", "0.25")
				}).render();
			});
			this.context.memo("button.resizeNoneVideo", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.rollback),
					tooltip: this.lang.video.resizeNone,
					click: this.context.createInvokeHandler("editor.resize", "0")
				}).render();
			});
			this.context.memo("button.floatLeftVideo", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.floatLeft),
					tooltip: this.lang.video.floatLeft,
					click: this.context.createInvokeHandler("editor.floatMe", "left")
				}).render();
			});
			this.context.memo("button.floatRightVideo", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.floatRight),
					tooltip: this.lang.video.floatRight,
					click: this.context.createInvokeHandler("editor.floatMe", "right")
				}).render();
			});
			this.context.memo("button.floatNoneVideo", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.rollback),
					tooltip: this.lang.video.floatNone,
					click: this.context.createInvokeHandler("editor.floatMe", "none")
				}).render();
			});
			this.context.memo("button.removeVideo", () => {
				return this.button({
					contents: this.ui.icon(this.options.icons.trash),
					tooltip: this.lang.video.remove,
					click: this.context.createInvokeHandler("editor.removeMedia")
				}).render();
			});
			this.context.memo("button.playMedia", () => {
				return this.button({
					contents: "<span class=\"note-fontsize-10\">Play</span>",
					tooltip: this.lang.video.play,
					click: this.context.createInvokeHandler("editor.playMedia")
				}).render();
			});
		}
		/**
		* table : [
		*  ['add', ['addRowDown', 'addRowUp', 'addColLeft', 'addColRight']],
		*  ['delete', ['deleteRow', 'deleteCol', 'deleteTable']]
		* ],
		*/
		addTablePopoverButtons() {
			this.context.memo("button.addRowUp", () => {
				return this.button({
					className: "btn-md",
					contents: this.ui.icon(this.options.icons.rowAbove),
					tooltip: this.lang.table.addRowAbove,
					click: this.context.createInvokeHandler("editor.addRow", "top")
				}).render();
			});
			this.context.memo("button.addRowDown", () => {
				return this.button({
					className: "btn-md",
					contents: this.ui.icon(this.options.icons.rowBelow),
					tooltip: this.lang.table.addRowBelow,
					click: this.context.createInvokeHandler("editor.addRow", "bottom")
				}).render();
			});
			this.context.memo("button.addColLeft", () => {
				return this.button({
					className: "btn-md",
					contents: this.ui.icon(this.options.icons.colBefore),
					tooltip: this.lang.table.addColLeft,
					click: this.context.createInvokeHandler("editor.addCol", "left")
				}).render();
			});
			this.context.memo("button.addColRight", () => {
				return this.button({
					className: "btn-md",
					contents: this.ui.icon(this.options.icons.colAfter),
					tooltip: this.lang.table.addColRight,
					click: this.context.createInvokeHandler("editor.addCol", "right")
				}).render();
			});
			this.context.memo("button.deleteRow", () => {
				return this.button({
					className: "btn-md",
					contents: this.ui.icon(this.options.icons.rowRemove),
					tooltip: this.lang.table.delRow,
					click: this.context.createInvokeHandler("editor.deleteRow")
				}).render();
			});
			this.context.memo("button.deleteCol", () => {
				return this.button({
					className: "btn-md",
					contents: this.ui.icon(this.options.icons.colRemove),
					tooltip: this.lang.table.delCol,
					click: this.context.createInvokeHandler("editor.deleteCol")
				}).render();
			});
			this.context.memo("button.deleteTable", () => {
				return this.button({
					className: "btn-md",
					contents: this.ui.icon(this.options.icons.trash),
					tooltip: this.lang.table.delTable,
					click: this.context.createInvokeHandler("editor.deleteTable")
				}).render();
			});
		}
		build($container, groups, options = {}) {
			for (let groupIdx = 0, groupLen = groups.length; groupIdx < groupLen; groupIdx++) {
				const group = groups[groupIdx];
				const groupName = Array.isArray(group) ? group[0] : group;
				const buttons = Array.isArray(group) ? group.length === 1 ? [group[0]] : group[1] : [group];
				const $group = this.ui.buttonGroup({ className: "note-" + groupName }).render();
				for (let idx = 0, len = buttons.length; idx < len; idx++) {
					const btn = this.context.memo("button." + buttons[idx]);
					if (btn) $group.append(typeof btn === "function" ? btn(this.context) : btn);
				}
				$group.appendTo($container);
			}
			if (options.classPrefix) this.applyContainerButtonClassNames($container, options.classPrefix);
		}
		/**
		* @param {DomQuery} [$container]
		*/
		updateCurrentStyle($container) {
			const $cont = $container || this.$toolbar;
			const styleInfo = this.context.invoke("editor.currentStyle");
			this.updateBtnStates($cont, {
				".note-btn-bold": () => {
					return styleInfo["font-bold"] === "bold";
				},
				".note-btn-italic": () => {
					return styleInfo["font-italic"] === "italic";
				},
				".note-btn-underline": () => {
					return styleInfo["font-underline"] === "underline";
				},
				".note-btn-subscript": () => {
					return styleInfo["font-subscript"] === "subscript";
				},
				".note-btn-superscript": () => {
					return styleInfo["font-superscript"] === "superscript";
				},
				".note-btn-strikethrough": () => {
					return styleInfo["font-strikethrough"] === "strikethrough";
				}
			});
			const currentStyleTag = this.getCurrentStyleTag(styleInfo);
			if (currentStyleTag) this.updateDropdownChecks($cont, ".dropdown-style a", ($item) => {
				return ($item.data("value") + "").toLowerCase() === currentStyleTag;
			});
			if (styleInfo["font-family"]) {
				const fontNames = styleInfo["font-family"].split(",").map((name) => this.normalizeFontFamilyName(name));
				const fontName = lists_default.find(fontNames, this.isFontInstalled.bind(this));
				this.updateDropdownChecks($cont, ".dropdown-fontname a", ($item) => {
					return $item.data("value") + "" === fontName + "";
				});
				const $currentFontName = $cont.find(".note-current-fontname");
				$currentFontName.text(fontName);
				$currentFontName.css("font-family", fontName);
			}
			if (styleInfo["font-size"]) {
				const fontSize = styleInfo["font-size"];
				this.updateDropdownChecks($cont, ".dropdown-fontsize a", ($item) => {
					return $item.data("value") + "" === fontSize + "";
				});
				$cont.find(".note-current-fontsize").text(fontSize);
				const fontSizeUnit = styleInfo["font-size-unit"];
				this.updateDropdownChecks($cont, ".dropdown-fontsizeunit a", ($item) => {
					return $item.data("value") + "" === fontSizeUnit + "";
				});
				$cont.find(".note-current-fontsizeunit").text(fontSizeUnit);
			}
			if (styleInfo["line-height"]) {
				const lineHeight = this.normalizeLineHeight(styleInfo["line-height"]);
				this.updateDropdownChecks($cont, ".dropdown-line-height a", ($item) => {
					return this.normalizeLineHeight($item.data("value")) === lineHeight;
				});
				$cont.find(".note-current-line-height").text(lineHeight);
			}
		}
		updateBtnStates($container, infos) {
			$$.each(infos, (selector, pred) => {
				this.ui.toggleBtnActive($container.find(selector), pred());
			});
		}
		tableMoveHandler(event) {
			const PX_PER_EM = 18;
			const $picker = $$(event.target.parentNode);
			const $dimensionDisplay = $picker.next();
			const $catcher = $picker.find(".note-dimension-picker-mousecatcher");
			const $highlighted = $picker.find(".note-dimension-picker-highlighted");
			const $unhighlighted = $picker.find(".note-dimension-picker-unhighlighted");
			let posOffset;
			if (event.offsetX === void 0) {
				const posCatcher = $$(event.target).offset();
				posOffset = {
					x: event.pageX - posCatcher.left,
					y: event.pageY - posCatcher.top
				};
			} else posOffset = {
				x: event.offsetX,
				y: event.offsetY
			};
			const dim = {
				c: Math.ceil(posOffset.x / PX_PER_EM) || 1,
				r: Math.ceil(posOffset.y / PX_PER_EM) || 1
			};
			$highlighted.css({
				width: dim.c + "em",
				height: dim.r + "em"
			});
			$catcher.data("value", dim.c + "x" + dim.r);
			if (dim.c > 3 && dim.c < this.options.insertTableMaxSize.col) $unhighlighted.css({ width: dim.c + 1 + "em" });
			if (dim.r > 3 && dim.r < this.options.insertTableMaxSize.row) $unhighlighted.css({ height: dim.r + 1 + "em" });
			$dimensionDisplay.html(dim.c + " x " + dim.r);
		}
	};
	//#endregion
	//#region src/js/module/Toolbar.js
	var Toolbar = class {
		constructor(context) {
			this.context = context;
			this.$window = $$(window);
			this.$document = $$(document);
			this.ui = $$.summernote.ui;
			this.$note = context.layoutInfo.note;
			this.$editor = context.layoutInfo.editor;
			this.$toolbar = context.layoutInfo.toolbar;
			this.$editingArea = context.layoutInfo.editingArea;
			this.$editable = context.layoutInfo.editable;
			this.$statusbar = context.layoutInfo.statusbar;
			this.options = context.options;
			this.isFollowing = false;
			this.followScroll = this.followScroll.bind(this);
			this.handleToolbarMouseDown = this.handleToolbarMouseDown.bind(this);
			this.handleToolbarClick = this.handleToolbarClick.bind(this);
			this.handleDropdownClick = this.handleDropdownClick.bind(this);
			this.handleDocumentClick = this.handleDocumentClick.bind(this);
			this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
			this.handleEditorInteraction = this.handleEditorInteraction.bind(this);
		}
		shouldInitialize() {
			return true;
		}
		initialize() {
			this.options.toolbar = this.options.toolbar || [];
			if (!this.options.airMode) {
				if (!this.options.toolbar.length) this.$toolbar.hide();
				else this.context.invoke("buttons.build", this.$toolbar, this.options.toolbar, { classPrefix: "toolbar" });
				if (this.options.toolbarContainer) this.$toolbar.appendTo(this.options.toolbarContainer);
				this.changeContainer(false);
			}
			this.$note.on("summernote.keyup summernote.mouseup summernote.change", () => {
				this.context.invoke("buttons.updateCurrentStyle");
			});
			this.context.invoke("buttons.updateCurrentStyle");
			if (!this.options.airMode && this.options.followingToolbar) this.$window.on("scroll resize", this.followScroll);
			if (!this.options.airMode) this.$toolbar.on("mousedown", this.handleToolbarMouseDown);
			this.$editingArea.on("mousedown click", this.handleEditorInteraction);
			this.$statusbar.on("mousedown click", this.handleEditorInteraction);
			this.$document.on("click", this.handleDropdownClick);
			this.$document.on("click", this.handleDocumentClick);
			this.$document.on("keydown", this.handleDocumentKeydown);
		}
		destroy() {
			if (!this.options.airMode) {
				this.$toolbar.children().remove();
				if (this.options.followingToolbar) this.$window.off("scroll resize", this.followScroll);
				this.$toolbar.off("mousedown", this.handleToolbarMouseDown);
			}
			this.$editingArea.off("mousedown click", this.handleEditorInteraction);
			this.$statusbar.off("mousedown click", this.handleEditorInteraction);
			this.$document.off("click", this.handleDropdownClick);
			this.$document.off("click", this.handleDocumentClick);
			this.$document.off("keydown", this.handleDocumentKeydown);
		}
		getDropdownGroup(target) {
			if (!(target instanceof Element)) return null;
			const group = target.closest(".note-btn-group");
			if (!group) return null;
			const toggle = group.querySelector("[data-note-toggle=\"dropdown\"]");
			const menu = group.querySelector(".note-dropdown-menu");
			return toggle && menu ? group : null;
		}
		getDropdownParts(group) {
			if (!group) return {};
			return {
				toggle: group.querySelector("[data-note-toggle=\"dropdown\"]"),
				menu: group.querySelector(".note-dropdown-menu")
			};
		}
		isDropdownOpen(group) {
			const { toggle, menu } = this.getDropdownParts(group);
			return Boolean(toggle && menu && toggle.classList.contains("show") && menu.classList.contains("show"));
		}
		openDropdown(group) {
			const { toggle, menu } = this.getDropdownParts(group);
			if (!toggle || !menu) return;
			toggle.classList.add("show");
			toggle.setAttribute("aria-expanded", "true");
			menu.setAttribute("data-bs-popper", "static");
			menu.classList.add("show");
		}
		closeDropdown(group) {
			const { toggle, menu } = this.getDropdownParts(group);
			if (!toggle || !menu) return;
			toggle.classList.remove("show");
			toggle.setAttribute("aria-expanded", "false");
			menu.removeAttribute("data-bs-popper");
			menu.classList.remove("show");
		}
		closeDropdowns(exceptGroup) {
			$$([this.$editor, this.$toolbar]).each((_, $container) => {
				$container.find(".note-btn-group").each((__, group) => {
					if (group !== exceptGroup) this.closeDropdown(group);
				});
			});
		}
		handleToolbarMouseDown(event) {
			if (!(event.target instanceof Element)) return;
			if (event.target.closest("input, textarea, select, option, label")) return;
			if (event.target.closest(".note-btn, .dropdown-item, .note-dropdown-menu")) {
				if (event.target.closest(".note-btn, .dropdown-item")) this.context.invoke("editor.saveRange");
				event.preventDefault();
			}
		}
		handleToolbarClick(event) {
			if (!(event.target instanceof Element)) return;
			this.handleDropdownClick(event);
		}
		handleDropdownClick(event) {
			if (!(event.target instanceof Element)) return;
			const toggle = event.target.closest("[data-note-toggle=\"dropdown\"]");
			if (toggle && (this.$editor[0].contains(toggle) || this.$toolbar[0].contains(toggle))) {
				event.preventDefault();
				const group = this.getDropdownGroup(toggle);
				const shouldOpen = group && !this.isDropdownOpen(group);
				this.closeDropdowns(group);
				if (shouldOpen) this.openDropdown(group);
				return;
			}
			if (event.target.closest(".note-dropdown-menu") || event.target.closest("button")) this.closeDropdowns();
		}
		handleDocumentClick(event) {
			if (!(event.target instanceof Element)) {
				this.closeDropdowns();
				return;
			}
			if (this.$editor[0].contains(event.target)) return;
			if (event.target.closest("[data-note-toggle=\"dropdown\"]") || event.target.closest(".note-dropdown-menu")) return;
			this.closeDropdowns();
		}
		handleDocumentKeydown(event) {
			if (event.key === "Escape") this.closeDropdowns();
		}
		handleEditorInteraction() {
			this.closeDropdowns();
		}
		followScroll() {
			if (this.$editor.hasClass("fullscreen")) return false;
			const editorHeight = this.$editor.outerHeight();
			const editorWidth = this.$editor.width();
			const toolbarHeight = this.$toolbar.height();
			const statusbarHeight = this.$statusbar.height();
			let otherBarHeight = 0;
			if (this.options.otherStaticBar) otherBarHeight = $$(this.options.otherStaticBar).outerHeight();
			const currentOffset = this.$document.scrollTop();
			const editorOffsetTop = this.$editor.offset().top;
			const editorOffsetBottom = editorOffsetTop + editorHeight;
			const activateOffset = editorOffsetTop - otherBarHeight;
			const deactivateOffsetBottom = editorOffsetBottom - otherBarHeight - toolbarHeight - statusbarHeight;
			if (!this.isFollowing && currentOffset > activateOffset && currentOffset < deactivateOffsetBottom - toolbarHeight) {
				this.isFollowing = true;
				this.$editable.css({ marginTop: this.$toolbar.outerHeight() });
				this.$toolbar.css({
					position: "fixed",
					top: otherBarHeight,
					width: editorWidth,
					zIndex: 1e3
				});
			} else if (this.isFollowing && (currentOffset < activateOffset || currentOffset > deactivateOffsetBottom)) {
				this.isFollowing = false;
				this.$toolbar.css({
					position: "relative",
					top: 0,
					width: "100%",
					zIndex: "auto"
				});
				this.$editable.css({ marginTop: "" });
			}
		}
		changeContainer(isFullscreen) {
			if (isFullscreen) this.$toolbar.prependTo(this.$editor);
			else if (this.options.toolbarContainer) this.$toolbar.appendTo(this.options.toolbarContainer);
			if (this.options.followingToolbar) this.followScroll();
		}
		updateFullscreen(isFullscreen) {
			this.ui.toggleBtnActive(this.$toolbar.find(".btn-fullscreen"), isFullscreen);
			this.changeContainer(isFullscreen);
		}
		updateCodeview(isCodeview) {
			this.ui.toggleBtnActive(this.$toolbar.find(".btn-codeview"), isCodeview);
			if (isCodeview) this.deactivate();
			else this.activate();
		}
		activate(isIncludeCodeview) {
			let $btn = this.$toolbar.find("button");
			if (!isIncludeCodeview) $btn = $btn.not(".note-codeview-keep");
			this.ui.toggleBtn($btn, true);
		}
		deactivate(isIncludeCodeview) {
			let $btn = this.$toolbar.find("button");
			if (!isIncludeCodeview) $btn = $btn.not(".note-codeview-keep");
			this.ui.toggleBtn($btn, false);
		}
	};
	//#endregion
	//#region src/js/module/LinkDialog.js
	var MAILTO_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	var TEL_PATTERN = /^\+?\d[\d\s-]{5,}\d$/;
	var URL_SCHEME_PATTERN = /^([A-Za-z][A-Za-z0-9+-.]*\:|#|\/)/;
	var LinkDialog = class {
		constructor(context) {
			this.context = context;
			this.ui = $$.summernote.ui;
			this.$body = $$(document.body);
			this.$editor = context.layoutInfo.editor;
			this.options = context.options;
			this.lang = this.options.langInfo;
			context.memo("help.linkDialog.show", this.options.langInfo.help["linkDialog.show"]);
		}
		initialize() {
			const $container = this.options.dialogsInBody ? this.$body : this.options.container;
			const body = [
				"<div class=\"note-link-dialog\">",
				"<div class=\"form-group note-form-group\">",
				`<label for="note-dialog-link-txt-${this.options.id}" class="note-form-label">${this.lang.link.textToDisplay}</label>`,
				`<input id="note-dialog-link-txt-${this.options.id}" class="note-link-text form-control note-form-control note-input" type="text"/>`,
				"</div>",
				"<div class=\"note-link-dialog-divider\" aria-hidden=\"true\"></div>",
				"<div class=\"form-group note-form-group\">",
				`<label for="note-dialog-link-url-${this.options.id}" class="note-form-label">${this.lang.link.url}</label>`,
				`<input id="note-dialog-link-url-${this.options.id}" class="note-link-url form-control note-form-control note-input" type="text" value="http://"/>`,
				"</div>",
				!this.options.disableLinkTarget ? (() => {
					const container = document.createElement("div");
					const checkbox = this.ui.checkbox({
						className: "sn-checkbox-open-in-new-window",
						text: this.lang.link.openInNewWindow,
						checked: true
					}).render();
					container.appendChild(checkbox.get(0));
					return container.innerHTML;
				})() : "",
				"</div>"
			].join("");
			const footer = `<button type="button" class="btn btn-primary note-btn note-btn-primary note-link-btn" disabled>${this.lang.link.insert}</button>`;
			this.$dialog = this.ui.dialog({
				className: "note-link-dialog-modal",
				title: this.lang.link.insert,
				fade: this.options.dialogsFade,
				body,
				footer
			}).render().appendTo($container);
		}
		destroy() {
			this.ui.hideDialog(this.$dialog);
			this.$dialog.remove();
		}
		bindEnterKey($input, $btn) {
			$input.on("keypress", (event) => {
				if (event.keyCode === key_default.code.ENTER) {
					event.preventDefault();
					$btn.trigger("click");
				}
			});
		}
		checkLinkUrl(linkUrl) {
			if (this.options.onCreateLink) return this.options.onCreateLink(linkUrl);
			if (MAILTO_PATTERN.test(linkUrl)) return "mailto:" + linkUrl;
			else if (TEL_PATTERN.test(linkUrl)) return "tel:" + linkUrl;
			else if (!URL_SCHEME_PATTERN.test(linkUrl)) return "http://" + linkUrl;
			return linkUrl;
		}
		onCheckLinkUrl($input) {
			$input.on("blur", (event) => {
				event.target.value = event.target.value == "" ? "" : this.checkLinkUrl(event.target.value);
			});
		}
		/**
		* toggle update button
		*/
		toggleLinkBtn($linkBtn, $linkText, $linkUrl) {
			this.ui.toggleBtn($linkBtn, $linkText.val() && $linkUrl.val());
		}
		/**
		* Show link dialog and set event handlers on dialog controls.
		*
		* @param {Object} linkInfo
		* @return {Promise}
		*/
		showLinkDialog(linkInfo) {
			return new Promise((resolve, reject) => {
				let isSettled = false;
				const $linkText = this.$dialog.find(".note-link-text");
				const $linkUrl = this.$dialog.find(".note-link-url");
				const $linkBtn = this.$dialog.find(".note-link-btn");
				const $openInNewWindow = this.$dialog.find(".sn-checkbox-open-in-new-window input[type=checkbox]");
				this.ui.onDialogShown(this.$dialog, () => {
					this.context.triggerEvent("dialog.shown");
					if (!linkInfo.url && func_default.isValidUrl(linkInfo.text)) linkInfo.url = this.checkLinkUrl(linkInfo.text);
					$linkText.on("input paste propertychange", () => {
						let text = $linkText.val();
						let div = document.createElement("div");
						div.innerText = text;
						text = div.innerHTML;
						linkInfo.text = text;
						this.toggleLinkBtn($linkBtn, $linkText, $linkUrl);
					}).val(linkInfo.text);
					$linkUrl.on("input paste propertychange", () => {
						if (!linkInfo.text) $linkText.val($linkUrl.val());
						this.toggleLinkBtn($linkBtn, $linkText, $linkUrl);
					}).val(linkInfo.url);
					if (!env_default.isSupportTouch) $linkUrl.trigger("focus");
					this.toggleLinkBtn($linkBtn, $linkText, $linkUrl);
					this.bindEnterKey($linkUrl, $linkBtn);
					this.bindEnterKey($linkText, $linkBtn);
					this.onCheckLinkUrl($linkUrl);
					const isNewWindowChecked = linkInfo.isNewWindow !== void 0 ? linkInfo.isNewWindow : this.context.options.linkTargetBlank;
					$openInNewWindow.prop("checked", isNewWindowChecked);
					$linkBtn.one("click", (event) => {
						event.preventDefault();
						isSettled = true;
						resolve({
							range: linkInfo.range,
							url: $linkUrl.val(),
							text: $linkText.val(),
							isNewWindow: $openInNewWindow.is(":checked")
						});
						this.ui.hideDialog(this.$dialog);
					});
				});
				this.ui.onDialogHidden(this.$dialog, () => {
					$linkText.off();
					$linkUrl.off();
					$linkBtn.off();
					if (!isSettled) {
						isSettled = true;
						reject();
					}
				});
				this.ui.showDialog(this.$dialog);
			});
		}
		/**
		* @param {Object} layoutInfo
		*/
		show() {
			const linkInfo = this.context.invoke("editor.getLinkInfo");
			this.context.invoke("editor.saveRange");
			this.showLinkDialog(linkInfo).then((linkInfo) => {
				this.context.invoke("editor.restoreRange");
				this.context.invoke("editor.createLink", linkInfo);
			}).catch(() => {
				this.context.invoke("editor.restoreRange");
			});
		}
	};
	//#endregion
	//#region src/js/module/LinkPopover.js
	var LinkPopover = class {
		constructor(context) {
			this.context = context;
			this.ui = $$.summernote.ui;
			this.options = context.options;
			this.events = {
				"summernote.keyup summernote.mouseup summernote.change summernote.scroll": () => {
					this.update();
				},
				"summernote.disable summernote.dialog.shown": () => {
					this.hide();
				},
				"summernote.blur": (we, event) => {
					if (event.originalEvent && event.originalEvent.relatedTarget) {
						if (!this.$popover[0].contains(event.originalEvent.relatedTarget)) this.hide();
					} else this.hide();
				}
			};
		}
		shouldInitialize() {
			return !lists_default.isEmpty(this.options.popover.link);
		}
		initialize() {
			this.$popover = this.ui.popover({
				className: "note-link-popover",
				callback: ($node) => {
					$node.find(".popover-content,.note-popover-content").prepend("<span><a target=\"_blank\"></a>&nbsp;</span>");
				}
			}).render().appendTo(this.options.container);
			const $content = this.$popover.find(".popover-content,.note-popover-content");
			this.context.invoke("buttons.build", $content, this.options.popover.link, { classPrefix: "popover" });
			this.$popover.on("mousedown", (event) => {
				event.preventDefault();
			});
		}
		destroy() {
			this.$popover.remove();
		}
		update() {
			if (!this.context.invoke("editor.hasFocus")) {
				this.hide();
				return;
			}
			const rng = this.context.invoke("editor.getLastRange");
			if (rng.isCollapsed() && rng.isOnAnchor()) {
				const anchor = dom_default.ancestor(rng.sc, dom_default.isAnchor);
				const href = $$(anchor).attr("href");
				this.$popover.find("a").attr("href", href).text(href);
				const pos = dom_default.posFromPlaceholder(anchor);
				const containerOffset = $$(this.options.container).offset();
				pos.top -= containerOffset.top;
				pos.left -= containerOffset.left;
				this.$popover.css({
					display: "block",
					left: pos.left,
					top: pos.top
				});
			} else this.hide();
		}
		hide() {
			this.$popover.hide();
		}
	};
	//#endregion
	//#region src/js/module/ImageDialog.js
	var ImageDialog = class {
		constructor(context) {
			this.context = context;
			this.ui = $$.summernote.ui;
			this.$body = $$(document.body);
			this.$editor = context.layoutInfo.editor;
			this.options = context.options;
			this.lang = this.options.langInfo;
		}
		initialize() {
			let imageLimitation = "";
			const imageInputId = "note-dialog-image-file-" + this.options.id;
			if (this.options.maximumImageFileSize) {
				const unit = Math.floor(Math.log(this.options.maximumImageFileSize) / Math.log(1024));
				const readableSize = (this.options.maximumImageFileSize / Math.pow(1024, unit)).toFixed(2) * 1 + " " + " KMGTP"[unit] + "B";
				imageLimitation = `<div class="note-image-dialog-help text-muted">${this.lang.image.maximumFileSize + " : " + readableSize}</div>`;
			}
			const $container = this.options.dialogsInBody ? this.$body : this.options.container;
			const buttonClass = "btn btn-primary note-btn note-btn-primary note-image-btn";
			const body = [
				"<div class=\"note-image-dialog\">",
				"<div class=\"form-group note-form-group note-group-select-from-files\">",
				"<label for=\"" + imageInputId + "\" class=\"note-form-label\">" + this.lang.image.selectFromFiles + "</label>",
				"<input id=\"" + imageInputId + "\" class=\"note-image-input form-control note-form-control note-input\"",
				" type=\"file\" name=\"files\" accept=\"" + this.options.acceptImageFileTypes + "\" multiple=\"multiple\"",
				" aria-label=\"" + this.lang.image.selectFromFiles + "\"/>",
				"<div class=\"note-image-dialog-file-name text-muted\" aria-live=\"polite\"></div>",
				imageLimitation,
				"</div>",
				"<div class=\"note-image-dialog-divider\" aria-hidden=\"true\"></div>",
				"<div class=\"form-group note-form-group note-group-image-url\">",
				"<label for=\"note-dialog-image-url-" + this.options.id + "\" class=\"note-form-label\">" + this.lang.image.url + "</label>",
				"<input id=\"note-dialog-image-url-" + this.options.id + "\" class=\"note-image-url form-control note-form-control note-input\" type=\"url\" placeholder=\"https://\"/>",
				"</div>",
				"</div>"
			].join("");
			const footer = `<button type="button" class="${buttonClass}" disabled>${this.lang.image.insert}</button>`;
			this.$dialog = this.ui.dialog({
				className: "note-image-dialog-modal",
				title: this.lang.image.insert,
				fade: this.options.dialogsFade,
				body,
				footer
			}).render().appendTo($container);
		}
		destroy() {
			this.ui.hideDialog(this.$dialog);
			this.$dialog.remove();
		}
		bindEnterKey($input, $btn) {
			$input.on("keypress", (event) => {
				if (event.keyCode === key_default.code.ENTER) {
					event.preventDefault();
					$btn.trigger("click");
				}
			});
		}
		show() {
			const preservedRange = this.context.modules.editor.lastRange || this.context.invoke("editor.getLastRange");
			this.showImageDialog().then((data) => {
				this.ui.hideDialog(this.$dialog);
				this.context.invoke("editor.setLastRange", preservedRange);
				this.context.invoke("editor.restoreRange");
				if (typeof data === "string") if (this.options.callbacks.onImageLinkInsert) this.context.triggerEvent("image.link.insert", data);
				else this.context.invoke("editor.insertImage", data);
				else this.context.invoke("editor.insertImagesOrCallback", data);
			}).catch(() => {
				this.context.invoke("editor.setLastRange", preservedRange);
				this.context.invoke("editor.restoreRange");
			});
		}
		/**
		* show image dialog
		*
		* @return {Promise}
		*/
		showImageDialog() {
			return new Promise((resolve, reject) => {
				let isSettled = false;
				const $imageInput = this.$dialog.find(".note-image-input");
				const $imageFileName = this.$dialog.find(".note-image-dialog-file-name");
				const $imageUrl = this.$dialog.find(".note-image-url");
				const $imageBtn = this.$dialog.find(".note-image-btn");
				this.ui.onDialogShown(this.$dialog, () => {
					this.context.triggerEvent("dialog.shown");
					$imageInput.off("change").val("").on("change", (event) => {
						const files = Array.from(event.target.files || []);
						if (!files.length) {
							$imageFileName.text("");
							return;
						}
						$imageFileName.text(files.map((file) => file.name).join(", "));
						isSettled = true;
						resolve(files);
					});
					$imageUrl.off().on("input paste propertychange", () => {
						this.ui.toggleBtn($imageBtn, $imageUrl.val().trim());
					}).val("");
					if (!env_default.isSupportTouch) $imageUrl.trigger("focus");
					$imageBtn.on("click", (event) => {
						event.preventDefault();
						isSettled = true;
						resolve($imageUrl.val().trim());
					});
					this.bindEnterKey($imageUrl, $imageBtn);
				});
				this.ui.onDialogHidden(this.$dialog, () => {
					$imageInput.off();
					$imageUrl.off();
					$imageBtn.off();
					$imageFileName.text("");
					if (!isSettled) {
						isSettled = true;
						reject();
					}
				});
				this.ui.showDialog(this.$dialog);
			});
		}
	};
	function computeImagePopoverPlacement({ containerWidth, containerHeight, imageTop, imageHeight, popoverWidth, popoverHeight, anchorLeft, anchorTop }) {
		const maxLeft = Math.max(0, containerWidth - popoverWidth);
		let left = anchorLeft - 20;
		left = Math.min(Math.max(left, 0), maxLeft);
		const maxTop = Math.max(0, (containerHeight || 0) - popoverHeight);
		const maxBottomTop = typeof imageHeight === "number" ? Math.min(imageTop + imageHeight, maxTop) : maxTop;
		const preferredTop = typeof anchorTop === "number" ? Math.min(anchorTop + 16, maxBottomTop) : null;
		const fallbackTop = Math.max(imageTop - popoverHeight - 16, 0);
		const top = preferredTop !== null && preferredTop >= imageTop ? preferredTop : fallbackTop;
		return {
			left,
			top,
			placement: top === fallbackTop ? "top" : "bottom"
		};
	}
	/**
	* Image popover module
	*  mouse events that show/hide popover will be handled by Handle.js.
	*  Handle.js will receive the events and invoke 'imagePopover.update'.
	*/
	var ImagePopover = class {
		constructor(context) {
			this.context = context;
			this.ui = $$.summernote.ui;
			this.editable = context.layoutInfo.editable[0];
			this.options = context.options;
			this.events = {
				"summernote.disable summernote.dialog.shown": () => {
					this.hide();
				},
				"summernote.blur": (we, event) => {
					if (!this.shouldKeepVisibleOnBlur(event)) this.hide();
				}
			};
		}
		getBlurRelatedTarget(event) {
			return event?.originalEvent?.relatedTarget || event?.relatedTarget || null;
		}
		shouldKeepVisibleOnBlur(event) {
			const relatedTarget = this.getBlurRelatedTarget(event);
			if (!(relatedTarget instanceof Element)) return false;
			if (this.$popover[0]?.contains(relatedTarget)) return true;
			return Boolean(this.anchorState?.target && (relatedTarget === this.anchorState.target || this.anchorState.target.contains?.(relatedTarget)));
		}
		getPointerLeft(event, imageLeft, imageWidth) {
			const point = event?.originalEvent?.touches?.[0] || event?.originalEvent?.changedTouches?.[0] || event?.originalEvent || event;
			if (point && typeof point.pageX === "number") return Math.min(Math.max(point.pageX - $$(this.options.container).offset().left, imageLeft), imageLeft + imageWidth);
			if (point && typeof point.clientX === "number") return Math.min(Math.max(point.clientX + window.scrollX - $$(this.options.container).offset().left, imageLeft), imageLeft + imageWidth);
			return null;
		}
		getPointerTop(event, imageTop, imageHeight) {
			const point = event?.originalEvent?.touches?.[0] || event?.originalEvent?.changedTouches?.[0] || event?.originalEvent || event;
			if (point && typeof point.pageY === "number") return Math.min(Math.max(point.pageY - $$(this.options.container).offset().top, imageTop), imageTop + imageHeight);
			if (point && typeof point.clientY === "number") return Math.min(Math.max(point.clientY + window.scrollY - $$(this.options.container).offset().top, imageTop), imageTop + imageHeight);
			return null;
		}
		shouldInitialize() {
			return !lists_default.isEmpty(this.options.popover.image);
		}
		initialize() {
			this.$popover = this.ui.popover({ className: "note-image-popover" }).render().appendTo(this.options.container);
			const $content = this.$popover.find(".popover-content,.note-popover-content");
			this.context.invoke("buttons.build", $content, this.options.popover.image, { classPrefix: "popover" });
			this.$popover.on("mousedown", (event) => {
				event.preventDefault();
			});
		}
		destroy() {
			this.$popover.remove();
		}
		applyPlacementStyles(placement) {
			this.$popover.attr("data-popper-placement", placement);
		}
		update(target, event) {
			if (dom_default.isImg(target)) {
				const $target = $$(target);
				const position = $target.offset();
				const containerOffset = $$(this.options.container).offset();
				const containerWidth = $$(this.options.container).innerWidth();
				const containerHeight = $$(this.options.container).innerHeight();
				const imageWidth = $target.outerWidth();
				const imageHeight = $target.outerHeight();
				this.$popover.css({
					display: "block",
					visibility: "hidden",
					left: 0,
					top: 0
				});
				const popoverWidth = this.$popover.outerWidth();
				const popoverHeight = this.$popover.outerHeight();
				const imageLeft = position.left - containerOffset.left;
				const imageTop = position.top - containerOffset.top;
				const pointerLeft = this.getPointerLeft(event, imageLeft, imageWidth);
				const pointerTop = this.getPointerTop(event, imageTop, imageHeight);
				if (pointerLeft !== null || pointerTop !== null) this.anchorState = {
					target,
					offsetX: pointerLeft !== null ? pointerLeft - imageLeft : imageWidth / 2,
					offsetY: pointerTop !== null ? pointerTop - imageTop : null
				};
				const anchorLeft = this.anchorState?.target === target ? imageLeft + Math.min(Math.max(this.anchorState.offsetX, 0), imageWidth) : imageLeft + imageWidth / 2;
				const { left, top, placement } = computeImagePopoverPlacement({
					containerWidth,
					containerHeight,
					imageTop,
					imageHeight,
					popoverWidth,
					popoverHeight,
					anchorLeft,
					anchorTop: this.anchorState?.target === target && typeof this.anchorState.offsetY === "number" ? imageTop + Math.min(Math.max(this.anchorState.offsetY, 0), imageHeight) : null
				});
				this.applyPlacementStyles(placement, anchorLeft, left, popoverWidth);
				this.$popover.css({
					display: "block",
					visibility: "visible",
					left,
					top
				});
			} else this.hide();
		}
		hide() {
			this.anchorState = null;
			this.$popover.hide();
		}
	};
	//#endregion
	//#region src/js/module/VideoPopover.js
	var VideoPopover = class {
		constructor(context) {
			this.context = context;
			this.ui = $$.summernote.ui;
			this.options = context.options;
			this.events = {
				"summernote.disable summernote.dialog.shown": () => {
					this.hide();
				},
				"summernote.blur": (we, event) => {
					if (!this.shouldKeepVisibleOnBlur(event)) this.hide();
				}
			};
		}
		shouldInitialize() {
			return !lists_default.isEmpty(this.options.popover.video);
		}
		initialize() {
			this.$popover = this.ui.popover({ className: "note-video-popover" }).render().appendTo(this.options.container);
			const $content = this.$popover.find(".popover-content,.note-popover-content");
			this.context.invoke("buttons.build", $content, this.options.popover.video, { classPrefix: "popover" });
			this.$popover.on("mousedown", (event) => {
				event.preventDefault();
			});
		}
		destroy() {
			this.$popover.remove();
		}
		getBlurRelatedTarget(event) {
			return event?.originalEvent?.relatedTarget || event?.relatedTarget || null;
		}
		shouldKeepVisibleOnBlur(event) {
			const relatedTarget = this.getBlurRelatedTarget(event);
			if (!(relatedTarget instanceof Element)) return false;
			if (this.$popover[0]?.contains(relatedTarget)) return true;
			return Boolean(this.anchorState?.target && (relatedTarget === this.anchorState.target || this.anchorState.target.contains?.(relatedTarget)));
		}
		getPointerLeft(event, mediaLeft, mediaWidth) {
			const point = event?.originalEvent?.touches?.[0] || event?.originalEvent?.changedTouches?.[0] || event?.originalEvent || event;
			if (point && typeof point.pageX === "number") return Math.min(Math.max(point.pageX - $$(this.options.container).offset().left, mediaLeft), mediaLeft + mediaWidth);
			if (point && typeof point.clientX === "number") return Math.min(Math.max(point.clientX + window.scrollX - $$(this.options.container).offset().left, mediaLeft), mediaLeft + mediaWidth);
			return null;
		}
		getPointerTop(event, mediaTop, mediaHeight) {
			const point = event?.originalEvent?.touches?.[0] || event?.originalEvent?.changedTouches?.[0] || event?.originalEvent || event;
			if (point && typeof point.pageY === "number") return Math.min(Math.max(point.pageY - $$(this.options.container).offset().top, mediaTop), mediaTop + mediaHeight);
			if (point && typeof point.clientY === "number") return Math.min(Math.max(point.clientY + window.scrollY - $$(this.options.container).offset().top, mediaTop), mediaTop + mediaHeight);
			return null;
		}
		applyPlacementStyles(placement) {
			this.$popover.attr("data-popper-placement", placement);
		}
		update(target, event) {
			if (dom_default.isVideoMedia(target)) {
				const $target = $$(target);
				const position = $target.offset();
				const containerOffset = $$(this.options.container).offset();
				const containerWidth = $$(this.options.container).innerWidth();
				const containerHeight = $$(this.options.container).innerHeight();
				const mediaWidth = $target.outerWidth();
				const mediaHeight = $target.outerHeight();
				this.$popover.css({
					display: "block",
					visibility: "hidden",
					left: 0,
					top: 0
				});
				const popoverWidth = this.$popover.outerWidth();
				const popoverHeight = this.$popover.outerHeight();
				const mediaLeft = position.left - containerOffset.left;
				const mediaTop = position.top - containerOffset.top;
				const pointerLeft = this.getPointerLeft(event, mediaLeft, mediaWidth);
				const pointerTop = this.getPointerTop(event, mediaTop, mediaHeight);
				if (pointerLeft !== null || pointerTop !== null) this.anchorState = {
					target,
					offsetX: pointerLeft !== null ? pointerLeft - mediaLeft : mediaWidth / 2,
					offsetY: pointerTop !== null ? pointerTop - mediaTop : null
				};
				const anchorLeft = this.anchorState?.target === target ? mediaLeft + Math.min(Math.max(this.anchorState.offsetX, 0), mediaWidth) : mediaLeft + mediaWidth / 2;
				const { left, top, placement } = computeImagePopoverPlacement({
					containerWidth,
					containerHeight,
					imageTop: mediaTop,
					imageHeight: mediaHeight,
					popoverWidth,
					popoverHeight,
					anchorLeft,
					anchorTop: this.anchorState?.target === target && typeof this.anchorState.offsetY === "number" ? mediaTop + Math.min(Math.max(this.anchorState.offsetY, 0), mediaHeight) : null
				});
				this.applyPlacementStyles(placement, anchorLeft, left, popoverWidth);
				this.$popover.css({
					display: "block",
					visibility: "visible",
					left,
					top
				});
			} else this.hide();
		}
		hide() {
			this.anchorState = null;
			this.$popover.hide();
		}
	};
	//#endregion
	//#region src/js/module/TablePopover.js
	var TablePopover = class {
		constructor(context) {
			this.context = context;
			this.ui = $$.summernote.ui;
			this.options = context.options;
			this.events = {
				"summernote.mousedown": (we, event) => {
					this.update(event.target);
				},
				"summernote.keyup summernote.scroll summernote.change": () => {
					this.update();
				},
				"summernote.disable summernote.dialog.shown": () => {
					this.hide();
				},
				"summernote.blur": (we, event) => {
					if (event.originalEvent && event.originalEvent.relatedTarget) {
						if (!this.$popover[0].contains(event.originalEvent.relatedTarget)) this.hide();
					} else this.hide();
				}
			};
		}
		shouldInitialize() {
			return !lists_default.isEmpty(this.options.popover.table);
		}
		initialize() {
			this.$popover = this.ui.popover({ className: "note-table-popover" }).render().appendTo(this.options.container);
			const $content = this.$popover.find(".popover-content,.note-popover-content");
			this.context.invoke("buttons.build", $content, this.options.popover.table, { classPrefix: "popover" });
			if (env_default.isFF) document.execCommand("enableInlineTableEditing", false, false);
			this.$popover.on("mousedown", (event) => {
				event.preventDefault();
			});
		}
		destroy() {
			this.$popover.remove();
		}
		applyPlacementStyles() {
			this.$popover.attr("data-popper-placement", "bottom");
		}
		update(target) {
			if (this.context.isDisabled()) return false;
			if (dom_default.isImg(target) || dom_default.ancestor(target, dom_default.isImg)) {
				this.hide();
				return false;
			}
			const cell = dom_default.isCell(target) ? target : dom_default.ancestor(target, dom_default.isCell);
			const isCell = !!cell;
			if (isCell) {
				this.context.invoke("editor.saveTarget", cell);
				const pos = dom_default.posFromPlaceholder(cell);
				const containerOffset = $$(this.options.container).offset();
				pos.top -= containerOffset.top;
				pos.left -= containerOffset.left;
				this.applyPlacementStyles();
				this.$popover.css({
					display: "block",
					left: pos.left,
					top: pos.top
				});
			} else this.hide();
			return isCell;
		}
		hide() {
			this.$popover.hide();
		}
	};
	//#endregion
	//#region src/js/module/VideoDialog.js
	var VideoDialog = class {
		constructor(context) {
			this.context = context;
			this.ui = $$.summernote.ui;
			this.$body = $$(document.body);
			this.$editor = context.layoutInfo.editor;
			this.options = context.options;
			this.lang = this.options.langInfo;
		}
		initialize() {
			const $container = this.options.dialogsInBody ? this.$body : this.options.container;
			const body = [
				"<div class=\"form-group note-form-group row-fluid\">",
				`<label for="note-dialog-video-url-${this.options.id}" class="note-form-label">${this.lang.video.url} <small class="text-muted">${this.lang.video.providers}</small></label>`,
				`<input id="note-dialog-video-url-${this.options.id}" class="note-video-url form-control note-form-control note-input" type="text"/>`,
				"</div>"
			].join("");
			const footer = `<input type="button" href="#" class="btn btn-primary note-btn note-btn-primary note-video-btn" value="${this.lang.video.insert}" disabled>`;
			this.$dialog = this.ui.dialog({
				title: this.lang.video.insert,
				fade: this.options.dialogsFade,
				body,
				footer
			}).render().appendTo($container);
		}
		destroy() {
			this.ui.hideDialog(this.$dialog);
			this.$dialog.remove();
		}
		bindEnterKey($input, $btn) {
			$input.on("keypress", (event) => {
				if (event.keyCode === key_default.code.ENTER) {
					event.preventDefault();
					$btn.trigger("click");
				}
			});
		}
		createVideoNode(url) {
			const ytRegExp = /(?:youtu\.be\/|youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=|shorts\/|live\/))([^&\n?]+)(?:.*[?&]t=([^&\n]+))?.*/;
			const ytRegExpForStart = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/;
			const ytMatch = url.match(ytRegExp);
			const gdMatch = url.match(/(?:\.|\/\/)drive\.google\.com\/file\/d\/(.[a-zA-Z0-9_-]*)\/view/);
			const igMatch = url.match(/(?:www\.|\/\/)instagram\.com\/(reel|p)\/(.[a-zA-Z0-9_-]*)/);
			const vMatch = url.match(/\/\/vine\.co\/v\/([a-zA-Z0-9]+)/);
			const vimMatch = url.match(/\/\/(player\.)?vimeo\.com\/([a-z]*\/)*(\d+)[?]?.*/);
			const dmMatch = url.match(/.+dailymotion.com\/(video|hub)\/([^_]+)[^#]*(#video=([^_&]+))?/);
			const youkuMatch = url.match(/\/\/v\.youku\.com\/v_show\/id_(\w+)=*\.html/);
			const peerTubeMatch = url.match(/\/\/(.*)\/videos\/watch\/([^?]*)(?:\?(?:start=(\w*))?(?:&stop=(\w*))?(?:&loop=([10]))?(?:&autoplay=([10]))?(?:&muted=([10]))?)?/);
			const qqMatch = url.match(/\/\/v\.qq\.com.*?vid=(.+)/);
			const qqMatch2 = url.match(/\/\/v\.qq\.com\/x?\/?(page|cover).*?\/([^\/]+)\.html\??.*/);
			const mp4Match = url.match(/^.+.(mp4|m4v)$/);
			const oggMatch = url.match(/^.+.(ogg|ogv)$/);
			const webmMatch = url.match(/^.+.(webm)$/);
			const fbMatch = url.match(/(?:www\.|\/\/)facebook\.com\/([^\/]+)\/videos\/([0-9]+)/);
			let $video;
			if (ytMatch && ytMatch[1].length === 11) {
				const youtubeId = ytMatch[1];
				var start = 0;
				if (typeof ytMatch[2] !== "undefined") {
					const ytMatchForStart = ytMatch[2].match(ytRegExpForStart);
					if (ytMatchForStart) for (var n = [
						3600,
						60,
						1
					], i = 0, r = n.length; i < r; i++) start += typeof ytMatchForStart[i + 1] !== "undefined" ? n[i] * parseInt(ytMatchForStart[i + 1], 10) : 0;
					else start = parseInt(ytMatch[2], 10);
				}
				$video = $$("<iframe>").attr("frameborder", 0).attr("src", "//www.youtube.com/embed/" + youtubeId + (start > 0 ? "?start=" + start : "")).attr("width", "640").attr("height", "360");
			} else if (gdMatch && gdMatch[0].length) $video = $$("<iframe>").attr("frameborder", 0).attr("src", "https://drive.google.com/file/d/" + gdMatch[1] + "/preview").attr("width", "640").attr("height", "480");
			else if (igMatch && igMatch[0].length) $video = $$("<iframe>").attr("frameborder", 0).attr("src", "https://instagram.com/p/" + igMatch[2] + "/embed/").attr("width", "612").attr("height", "710").attr("scrolling", "no").attr("allowtransparency", "true");
			else if (vMatch && vMatch[0].length) $video = $$("<iframe>").attr("frameborder", 0).attr("src", vMatch[0] + "/embed/simple").attr("width", "600").attr("height", "600").attr("class", "vine-embed");
			else if (vimMatch && vimMatch[3].length) $video = $$("<iframe webkitallowfullscreen mozallowfullscreen allowfullscreen>").attr("frameborder", 0).attr("src", "//player.vimeo.com/video/" + vimMatch[3]).attr("width", "640").attr("height", "360");
			else if (dmMatch && dmMatch[2].length) $video = $$("<iframe>").attr("frameborder", 0).attr("src", "//www.dailymotion.com/embed/video/" + dmMatch[2]).attr("width", "640").attr("height", "360");
			else if (youkuMatch && youkuMatch[1].length) $video = $$("<iframe webkitallowfullscreen mozallowfullscreen allowfullscreen>").attr("frameborder", 0).attr("height", "498").attr("width", "510").attr("src", "//player.youku.com/embed/" + youkuMatch[1]);
			else if (peerTubeMatch && peerTubeMatch[0].length) {
				const begin = Number(peerTubeMatch[3] || 0);
				const end = Number(peerTubeMatch[4] || 0);
				const loop = peerTubeMatch[5] || 0;
				const autoplay = peerTubeMatch[6] || 0;
				const muted = peerTubeMatch[7] || 0;
				$video = $$("<iframe allowfullscreen sandbox=\"allow-same-origin allow-scripts allow-popups\">").attr("frameborder", 0).attr("src", "//" + peerTubeMatch[1] + "/videos/embed/" + peerTubeMatch[2] + "?loop=" + loop + "&autoplay=" + autoplay + "&muted=" + muted + (begin > 0 ? "&start=" + begin : "") + (end > 0 ? "&end=" + end : "")).attr("width", "560").attr("height", "315");
			} else if (qqMatch && qqMatch[1].length || qqMatch2 && qqMatch2[2].length) {
				const vid = qqMatch && qqMatch[1].length ? qqMatch[1] : qqMatch2[2];
				$video = $$("<iframe webkitallowfullscreen mozallowfullscreen allowfullscreen>").attr("frameborder", 0).attr("height", "310").attr("width", "500").attr("src", "https://v.qq.com/txp/iframe/player.html?vid=" + vid + "&auto=0");
			} else if (mp4Match || oggMatch || webmMatch) $video = $$("<video controls>").attr("src", url).attr("width", "640").attr("height", "360");
			else if (fbMatch && fbMatch[0].length) $video = $$("<iframe>").attr("frameborder", 0).attr("src", "https://www.facebook.com/plugins/video.php?href=" + encodeURIComponent(fbMatch[0]) + "&show_text=0&width=560").attr("width", "560").attr("height", "301").attr("scrolling", "no").attr("allowtransparency", "true");
			else return false;
			$video.addClass("note-video-clip");
			return $video[0];
		}
		show() {
			const text = this.context.invoke("editor.getSelectedText");
			this.context.invoke("editor.saveRange");
			this.showVideoDialog(text).then((url) => {
				this.ui.hideDialog(this.$dialog);
				this.context.invoke("editor.restoreRange");
				const $node = this.createVideoNode(url);
				if ($node) this.context.invoke("editor.insertNode", $node);
			}).catch(() => {
				this.context.invoke("editor.restoreRange");
			});
		}
		/**
		* show video dialog
		*
		* @return {Promise}
		*/
		showVideoDialog() {
			return new Promise((resolve, reject) => {
				let isSettled = false;
				const $videoUrl = this.$dialog.find(".note-video-url");
				const $videoBtn = this.$dialog.find(".note-video-btn");
				this.ui.onDialogShown(this.$dialog, () => {
					this.context.triggerEvent("dialog.shown");
					$videoUrl.on("input paste propertychange", () => {
						this.ui.toggleBtn($videoBtn, $videoUrl.val());
					});
					if (!env_default.isSupportTouch) $videoUrl.trigger("focus");
					$videoBtn.on("click", (event) => {
						event.preventDefault();
						isSettled = true;
						resolve($videoUrl.val());
					});
					this.bindEnterKey($videoUrl, $videoBtn);
				});
				this.ui.onDialogHidden(this.$dialog, () => {
					$videoUrl.off();
					$videoBtn.off();
					if (!isSettled) {
						isSettled = true;
						reject();
					}
				});
				this.ui.showDialog(this.$dialog);
			});
		}
	};
	//#endregion
	//#region src/js/module/HelpDialog.js
	var HelpDialog = class {
		constructor(context) {
			this.context = context;
			this.ui = $$.summernote.ui;
			this.$body = $$(document.body);
			this.$editor = context.layoutInfo.editor;
			this.options = context.options;
			this.lang = this.options.langInfo;
		}
		initialize() {
			const $container = this.options.dialogsInBody ? this.$body : this.options.container;
			this.$dialog = this.ui.dialog({
				className: "note-help-dialog-modal",
				title: this.lang.options.help,
				fade: this.options.dialogsFade,
				body: this.createDialogBody(),
				footer: this.createDialogFooter(),
				callback: ($node) => {
					$node.find(".modal-body,.note-modal-body").css({
						"max-height": 420,
						"overflow-y": "auto"
					});
				}
			}).render().appendTo($container);
		}
		destroy() {
			this.ui.hideDialog(this.$dialog);
			this.$dialog.remove();
		}
		escapeHtml(value) {
			return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;").replaceAll("'", "&#39;");
		}
		formatShortcutToken(token) {
			return {
				CMD: "⌘",
				CTRL: "Ctrl",
				SHIFT: "Shift",
				ENTER: "Enter",
				ESC: "Esc",
				TAB: "Tab",
				BACKSLASH: "\\",
				LEFTBRACKET: "[",
				RIGHTBRACKET: "]",
				NUM0: "0",
				NUM1: "1",
				NUM2: "2",
				NUM3: "3",
				NUM4: "4",
				NUM5: "5",
				NUM6: "6",
				NUM7: "7",
				NUM8: "8"
			}[token] || token;
		}
		renderShortcut(shortcut) {
			return shortcut.split("+").map((token) => `<kbd>${this.escapeHtml(this.formatShortcutToken(token))}</kbd>`).join("<span class=\"note-help-dialog-shortcut-separator\">+</span>");
		}
		getShortcutSections() {
			const keyMap = this.options.keyMap[env_default.isMac ? "mac" : "pc"];
			const shortcuts = new Map(Object.entries(keyMap).map(([shortcut, command]) => [command, shortcut]));
			return [
				{
					title: this.lang.shortcut.action,
					commands: [
						"undo",
						"redo",
						"linkDialog.show"
					]
				},
				{
					title: this.lang.shortcut.textFormatting,
					commands: [
						"bold",
						"italic",
						"underline",
						"strikethrough",
						"removeFormat"
					]
				},
				{
					title: this.lang.shortcut.paragraphFormatting,
					commands: [
						"insertParagraph",
						"insertUnorderedList",
						"insertOrderedList",
						"outdent",
						"indent",
						"justifyLeft",
						"justifyCenter",
						"justifyRight",
						"justifyFull"
					]
				},
				{
					title: this.lang.shortcut.documentStyle,
					commands: [
						"formatPara",
						"formatH1",
						"formatH2",
						"formatH3",
						"formatH4",
						"formatH5",
						"formatH6",
						"insertHorizontalRule"
					]
				},
				{
					title: this.lang.shortcut.extraKeys,
					commands: [
						"escape",
						"tab",
						"untab"
					]
				}
			].map((section) => ({
				...section,
				items: section.commands.filter((command) => shortcuts.has(command)).map((command) => ({
					command,
					shortcut: shortcuts.get(command),
					description: this.context.memo("help." + command) || command
				}))
			})).filter((section) => section.items.length > 0);
		}
		createDialogBody() {
			const platformLabel = env_default.isMac ? this.lang.helpDialog?.platform?.mac || "macOS" : this.lang.helpDialog?.platform?.pc || "Windows and Linux";
			const sections = this.getShortcutSections().map((section) => `
      <section class="note-help-dialog-section" aria-label="${this.escapeHtml(section.title)}">
        <h5 class="note-help-dialog-section-title">${this.escapeHtml(section.title)}</h5>
        <div class="note-help-dialog-list">
          ${section.items.map((item) => `
            <div class="note-help-dialog-item">
              <div class="note-help-dialog-item-shortcut">${this.renderShortcut(item.shortcut)}</div>
              <div class="note-help-dialog-item-copy">${this.escapeHtml(item.description)}</div>
            </div>
          `).join("")}
        </div>
      </section>
    `).join("");
			return `
      <div class="note-help-dialog">
        <div class="note-help-dialog-intro">
          <p class="note-help-dialog-lead">${this.escapeHtml(this.lang.shortcut.shortcuts)}</p>
          <p class="note-help-dialog-meta">
            <span class="note-help-dialog-platform">${this.escapeHtml(platformLabel)}</span>
          </p>
        </div>
        ${sections}
      </div>
    `;
		}
		createDialogFooter() {
			const versionLabel = this.escapeHtml($$.summernote.version);
			return `
      <div class="note-help-dialog-footer">
        <span class="note-help-dialog-footer-copy">${this.escapeHtml(this.lang.helpDialog?.brand || "Summernote Next")} ${versionLabel}</span>
        <span class="note-help-dialog-footer-links">
          <a href="https://juergen-schwind.com/summernote-next" target="_blank" rel="noopener noreferrer">${this.escapeHtml(this.lang.helpDialog?.links?.examples || "Examples")}</a>
          <span aria-hidden="true">·</span>
          <a href="https://github.com/summernote-next/summernote-next" target="_blank" rel="noopener noreferrer">${this.escapeHtml(this.lang.helpDialog?.links?.project || "Project")}</a>
          <span aria-hidden="true">·</span>
          <a href="https://github.com/summernote-next/summernote-next/issues" target="_blank" rel="noopener noreferrer">${this.escapeHtml(this.lang.helpDialog?.links?.issues || "Issues")}</a>
        </span>
      </div>
    `;
		}
		/**
		* show help dialog
		*
		* @return {Promise}
		*/
		showHelpDialog() {
			return new Promise((resolve) => {
				this.ui.onDialogShown(this.$dialog, () => {
					this.context.triggerEvent("dialog.shown");
					resolve();
				});
				this.ui.showDialog(this.$dialog);
			});
		}
		show() {
			this.context.invoke("editor.saveRange");
			this.showHelpDialog().then(() => {
				this.context.invoke("editor.restoreRange");
			});
		}
	};
	//#endregion
	//#region src/js/module/AirPopover.js
	var AIRMODE_POPOVER_X_OFFSET = -5;
	var AIRMODE_POPOVER_Y_OFFSET = 5;
	var AIRMODE_POPOVER_EDGE_PADDING = 10;
	var AirPopover = class {
		constructor(context) {
			this.context = context;
			this.ui = $$.summernote.ui;
			this.options = context.options;
			this.hidable = true;
			this.onContextmenu = false;
			this.pageX = null;
			this.pageY = null;
			this.events = {
				"summernote.contextmenu": (event) => {
					if (this.options.editing) {
						event.preventDefault();
						event.stopPropagation();
						this.onContextmenu = true;
						this.update(true);
					}
				},
				"summernote.mousedown": (we, event) => {
					this.pageX = event.pageX;
					this.pageY = event.pageY;
				},
				"summernote.keyup summernote.mouseup summernote.scroll": (we, event) => {
					if (this.options.editing && !this.onContextmenu) {
						if (event.type == "keyup") {
							let wordRange = this.context.invoke("editor.getLastRange").getWordRange();
							const bnd = func_default.rect2bnd(lists_default.last(wordRange.getClientRects()));
							this.pageX = bnd.left;
							this.pageY = bnd.top;
						} else {
							this.pageX = event.pageX;
							this.pageY = event.pageY;
						}
						this.update();
					}
					this.onContextmenu = false;
				},
				"summernote.disable summernote.change summernote.dialog.shown summernote.blur": () => {
					this.hide();
				},
				"summernote.focusout": () => {
					if (!this.$popover.is(":active,:focus")) this.hide();
				}
			};
		}
		shouldInitialize() {
			return this.options.airMode && !lists_default.isEmpty(this.options.popover.air);
		}
		initialize() {
			this.$popover = this.ui.popover({ className: "note-air-popover" }).render().appendTo(this.options.container);
			this.$editable = this.context.layoutInfo.editable;
			const $content = this.$popover.find(".popover-content,.note-popover-content");
			this.context.invoke("buttons.build", $content, this.options.popover.air, { classPrefix: "popover" });
			this.$popover.on("mousedown", () => {
				this.hidable = false;
			});
			this.$popover.on("mouseup", () => {
				this.hidable = true;
			});
		}
		destroy() {
			this.$popover.remove();
		}
		update(forcelyOpen) {
			const styleInfo = this.context.invoke("editor.currentStyle");
			if (styleInfo.range && (!styleInfo.range.isCollapsed() || forcelyOpen)) {
				this.$popover.css("display", "block");
				this.reposition();
				this.context.invoke("buttons.updateCurrentStyle", this.$popover);
			} else this.hide();
		}
		reposition() {
			let lastWidth = -1;
			let frames = 0;
			const settle = () => {
				if (!this.$popover || !this.$popover[0]) return;
				const popoverWidth = this.$popover[0].offsetWidth;
				if (popoverWidth === lastWidth || frames >= 10) {
					const containerOffset = $$(this.options.container).offset();
					this.applyPosition(containerOffset, popoverWidth);
					return;
				}
				lastWidth = popoverWidth;
				frames++;
				setTimeout(settle, 16);
			};
			setTimeout(settle, 16);
		}
		applyPosition(containerOffset, popoverWidth) {
			let left = this.pageX - containerOffset.left + AIRMODE_POPOVER_X_OFFSET;
			let top = this.pageY - containerOffset.top + AIRMODE_POPOVER_Y_OFFSET;
			let maxRight = window.innerWidth - containerOffset.left - AIRMODE_POPOVER_EDGE_PADDING;
			const editable = this.$editable && this.$editable[0];
			if (editable) {
				const editableRight = editable.getBoundingClientRect().right - containerOffset.left - AIRMODE_POPOVER_EDGE_PADDING;
				if (editableRight < maxRight) maxRight = editableRight;
			}
			const maxLeft = maxRight - popoverWidth;
			if (left > maxLeft) left = Math.max(AIRMODE_POPOVER_EDGE_PADDING - containerOffset.left, maxLeft);
			this.$popover.css({
				left: Math.max(left, AIRMODE_POPOVER_EDGE_PADDING - containerOffset.left),
				top
			});
		}
		updateCodeview(isCodeview) {
			this.ui.toggleBtnActive(this.$popover.find(".btn-codeview"), isCodeview);
			if (isCodeview) this.hide();
		}
		hide() {
			if (this.hidable) this.$popover.hide();
		}
	};
	//#endregion
	//#region src/js/module/HintPopover.js
	var POPOVER_DIST = 5;
	var HintPopover = class {
		constructor(context) {
			this.context = context;
			this.ui = $$.summernote.ui;
			this.$editable = context.layoutInfo.editable;
			this.options = context.options;
			this.hint = this.options.hint || [];
			this.direction = this.options.hintDirection || "bottom";
			this.hints = Array.isArray(this.hint) ? this.hint : [this.hint];
			this.events = {
				"summernote.keyup": (we, event) => {
					if (!event.isDefaultPrevented()) this.handleKeyup(event);
				},
				"summernote.keydown": (we, event) => {
					this.handleKeydown(event);
				},
				"summernote.disable summernote.dialog.shown summernote.blur": () => {
					this.hide();
				}
			};
		}
		shouldInitialize() {
			return this.hints.length > 0;
		}
		initialize() {
			this.lastWordRange = null;
			this.matchingWord = null;
			this.$popover = this.ui.popover({
				className: "note-hint-popover",
				direction: ""
			}).render().appendTo(this.options.container);
			this.$popover.hide();
			this.$content = this.$popover.find(".popover-content,.note-popover-content");
			this.$content.addClass("note-hint-content").attr("role", "listbox");
			this.$content.on("click", ".note-hint-item", (event) => {
				const target = event.target.closest(".note-hint-item");
				this.$content.find(".note-hint-item").attr("aria-selected", "false").removeClass("active");
				$$(target).addClass("active");
				$$(target).attr("aria-selected", "true");
				this.replace();
			});
			this.$popover.on("mousedown", (event) => {
				event.preventDefault();
			});
		}
		destroy() {
			this.$popover.remove();
		}
		selectItem($item) {
			this.$content.find(".note-hint-item").attr("aria-selected", "false").removeClass("active");
			$item.addClass("active");
			$item.attr("aria-selected", "true");
			this.$content[0].scrollTop = $item[0].offsetTop - this.$content.innerHeight() / 2;
		}
		moveDown() {
			const $current = this.$content.find(".note-hint-item.active");
			const $next = $current.next();
			if ($next.length) this.selectItem($next);
			else {
				let $nextGroup = $current.parent().next();
				if (!$nextGroup.length) $nextGroup = this.$content.find(".note-hint-group").first();
				this.selectItem($nextGroup.find(".note-hint-item").first());
			}
		}
		moveUp() {
			const $current = this.$content.find(".note-hint-item.active");
			const $prev = $current.prev();
			if ($prev.length) this.selectItem($prev);
			else {
				let $prevGroup = $current.parent().prev();
				if (!$prevGroup.length) $prevGroup = this.$content.find(".note-hint-group").last();
				this.selectItem($prevGroup.find(".note-hint-item").last());
			}
		}
		replace() {
			const $item = this.$content.find(".note-hint-item.active");
			if ($item.length) {
				var node = this.nodeFromItem($item);
				if (this.matchingWord !== null && this.matchingWord.length === 0) this.lastWordRange.so = this.lastWordRange.eo;
				else if (this.matchingWord !== null && this.matchingWord.length > 0 && !this.lastWordRange.isCollapsed()) {
					let rangeCompute = this.lastWordRange.eo - this.lastWordRange.so - this.matchingWord.length;
					if (rangeCompute > 0) this.lastWordRange.so += rangeCompute;
				}
				this.lastWordRange.insertNode(node);
				if (this.options.hintSelect === "next") {
					var blank = document.createTextNode("");
					$$(node).after(blank);
					range_default.createFromNodeBefore(blank).select();
				} else range_default.createFromNodeAfter(node).select();
				this.lastWordRange = null;
				this.hide();
				this.context.invoke("editor.focus");
				this.context.triggerEvent("change", this.$editable.html(), this.$editable);
			}
		}
		nodeFromItem($item) {
			const hint = this.hints[$item.data("index")];
			const item = $item.data("item");
			let node = hint.content ? hint.content(item) : item;
			if (typeof node === "string") node = dom_default.createText(node);
			return node;
		}
		createItemTemplates(hintIdx, items) {
			const hint = this.hints[hintIdx];
			return items.map((item, idx) => {
				const $item = $$("<button type=\"button\" class=\"note-hint-item list-group-item list-group-item-action\" role=\"option\" aria-selected=\"false\"></button>");
				$item.append(hint.template ? hint.template(item) : item + "");
				$item.data({
					"index": hintIdx,
					"item": item
				});
				if (hintIdx === 0 && idx === 0) {
					$item.addClass("active");
					$item.attr("aria-selected", "true");
				}
				return $item;
			});
		}
		handleKeydown(event) {
			if (this.$popover.css("display") === "none") return;
			if (event.keyCode === key_default.code.ENTER) {
				event.preventDefault();
				this.replace();
			} else if (event.keyCode === key_default.code.UP) {
				event.preventDefault();
				this.moveUp();
			} else if (event.keyCode === key_default.code.DOWN) {
				event.preventDefault();
				this.moveDown();
			}
		}
		searchKeyword(index, keyword, callback) {
			const hint = this.hints[index];
			if (hint && hint.match.test(keyword) && hint.search) {
				const matches = hint.match.exec(keyword);
				this.matchingWord = matches[0];
				hint.search(matches[1], callback);
			} else callback();
		}
		createGroup(idx, keyword) {
			const $group = $$("<div class=\"note-hint-group note-hint-group-" + idx + "\"></div>");
			this.searchKeyword(idx, keyword, (items) => {
				items = items || [];
				if (items.length) {
					$group.html(this.createItemTemplates(idx, items));
					this.show();
				}
			});
			return $group;
		}
		handleKeyup(event) {
			if (!lists_default.contains([
				key_default.code.ENTER,
				key_default.code.UP,
				key_default.code.DOWN
			], event.keyCode)) {
				let range = this.context.invoke("editor.getLastRange");
				let wordRange, keyword;
				if (this.options.hintMode === "words") {
					wordRange = range.getWordsRange(range);
					keyword = wordRange.toString();
					this.hints.forEach((hint) => {
						if (hint.match.test(keyword)) {
							wordRange = range.getWordsMatchRange(hint.match);
							return false;
						}
					});
					if (!wordRange) {
						this.hide();
						return;
					}
					keyword = wordRange.toString();
				} else {
					wordRange = range.getWordRange();
					keyword = wordRange.toString();
				}
				if (this.hints.length && keyword) {
					this.$content.empty();
					const bnd = func_default.rect2bnd(lists_default.last(wordRange.getClientRects()));
					const containerOffset = $$(this.options.container).offset();
					bnd.top -= containerOffset.top;
					bnd.left -= containerOffset.left;
					this.$popover.hide();
					this.lastWordRange = wordRange;
					this.hints.forEach((hint, idx) => {
						if (hint.match.test(keyword)) this.createGroup(idx, keyword).appendTo(this.$content);
					});
					this.$content.find(".note-hint-item").first().addClass("active");
					if (this.direction === "top") this.$popover.css({
						left: bnd.left,
						top: bnd.top - this.$popover.outerHeight() - POPOVER_DIST
					});
					else this.$popover.css({
						left: bnd.left,
						top: bnd.top + bnd.height + POPOVER_DIST
					});
				} else this.hide();
			}
		}
		show() {
			this.$popover.show();
		}
		hide() {
			this.$popover.hide();
		}
	};
	//#endregion
	//#region src/js/settings.js
	$$.summernote = $$.extend($$.summernote, {
		version: "1.0.1",
		plugins: {},
		dom: dom_default,
		range: range_default,
		lists: lists_default,
		options: {
			langInfo: $$.summernote.lang["en-US"],
			editing: true,
			modules: {
				"editor": Editor,
				"clipboard": Clipboard,
				"dropzone": Dropzone,
				"codeview": CodeView,
				"statusbar": Statusbar,
				"fullscreen": Fullscreen,
				"handle": Handle,
				"hintPopover": HintPopover,
				"autoLink": AutoLink,
				"autoSync": AutoSync,
				"autoReplace": AutoReplace,
				"placeholder": Placeholder,
				"buttons": Buttons,
				"toolbar": Toolbar,
				"linkDialog": LinkDialog,
				"linkPopover": LinkPopover,
				"imageDialog": ImageDialog,
				"imagePopover": ImagePopover,
				"videoPopover": VideoPopover,
				"tablePopover": TablePopover,
				"videoDialog": VideoDialog,
				"helpDialog": HelpDialog,
				"airPopover": AirPopover
			},
			buttons: {},
			lang: "en-US",
			followingToolbar: false,
			toolbarPosition: "top",
			otherStaticBar: "",
			editorClassName: "",
			editingAreaClassName: "",
			editableClassName: "",
			codableClassName: "",
			statusbarClassName: "",
			modalClassName: "",
			codeviewKeepButton: false,
			toolbarClassName: "",
			toolbarButtonClassName: "",
			toolbarButtonGroupClassName: "",
			toolbarUseNativeButtonGroups: false,
			toolbar: [
				["style", ["style"]],
				["font", [
					"bold",
					"underline",
					"clear"
				]],
				["fontname", ["fontname"]],
				["color", ["color"]],
				["para", [
					"ul",
					"ol",
					"paragraph"
				]],
				["table", ["table"]],
				["insert", [
					"link",
					"picture",
					"video"
				]],
				["view", [
					"fullscreen",
					"codeview",
					"help"
				]]
			],
			popatmouse: true,
			popoverClassName: "",
			popoverButtonClassName: "",
			popoverButtonGroupClassName: "",
			popoverUseNativeButtonGroups: false,
			popover: {
				image: [
					["resize", [
						"resizeFull",
						"resizeHalf",
						"resizeQuarter",
						"resizeNone"
					]],
					["float", [
						"floatLeft",
						"floatRight",
						"floatNone"
					]],
					["remove", ["removeMedia"]]
				],
				video: [
					["play", ["playMedia"]],
					["resize", [
						"resizeFullVideo",
						"resizeHalfVideo",
						"resizeQuarterVideo",
						"resizeNoneVideo"
					]],
					["float", [
						"floatLeftVideo",
						"floatRightVideo",
						"floatNoneVideo"
					]],
					["remove", ["removeVideo"]]
				],
				link: [["link", ["linkDialogShow", "unlink"]]],
				table: [["add", [
					"addRowDown",
					"addRowUp",
					"addColLeft",
					"addColRight"
				]], ["delete", [
					"deleteRow",
					"deleteCol",
					"deleteTable"
				]]],
				air: [
					["color", ["color"]],
					["font", [
						"bold",
						"underline",
						"clear"
					]],
					["para", ["ul", "paragraph"]],
					["table", ["table"]],
					["insert", ["link", "picture"]],
					["view", ["fullscreen", "codeview"]]
				]
			},
			linkAddNoReferrer: false,
			addLinkNoOpener: false,
			airMode: false,
			airModeFullscreen: false,
			airModeFullscreenProxy: false,
			airModeFullscreenState: null,
			overrideContextMenu: false,
			width: null,
			height: null,
			linkTargetBlank: true,
			focus: false,
			tabDisable: false,
			tabSize: 4,
			styleWithCSS: false,
			shortcuts: true,
			textareaAutoSync: true,
			tooltip: "auto",
			container: null,
			maxTextLength: 0,
			blockquoteBreakingLevel: 2,
			spellCheck: true,
			disableGrammar: false,
			placeholder: null,
			inheritPlaceholder: false,
			recordEveryKeystroke: false,
			historyLimit: 200,
			showDomainOnlyForAutolink: false,
			hintMode: "word",
			hintSelect: "after",
			hintDirection: "bottom",
			styleTags: [
				"p",
				"blockquote",
				"pre",
				"h1",
				"h2",
				"h3",
				"h4",
				"h5",
				"h6"
			],
			fontNames: [
				"Arial",
				"Arial Black",
				"Comic Sans MS",
				"Courier New",
				"Helvetica Neue",
				"Helvetica",
				"Impact",
				"Lucida Grande",
				"Tahoma",
				"Times New Roman",
				"Verdana"
			],
			fontNamesIgnoreCheck: [],
			addDefaultFonts: true,
			fontSizes: [
				"8",
				"9",
				"10",
				"11",
				"12",
				"14",
				"18",
				"24",
				"36"
			],
			fontSizeUnits: ["px", "pt"],
			colors: [
				[
					"#000000",
					"#424242",
					"#636363",
					"#9C9C94",
					"#CEC6CE",
					"#EFEFEF",
					"#F7F7F7",
					"#FFFFFF"
				],
				[
					"#FF0000",
					"#FF9C00",
					"#FFFF00",
					"#00FF00",
					"#00FFFF",
					"#0000FF",
					"#9C00FF",
					"#FF00FF"
				],
				[
					"#F7C6CE",
					"#FFE7CE",
					"#FFEFC6",
					"#D6EFD6",
					"#CEDEE7",
					"#CEE7F7",
					"#D6D6E7",
					"#E7D6DE"
				],
				[
					"#E79C9C",
					"#FFC69C",
					"#FFE79C",
					"#B5D6A5",
					"#A5C6CE",
					"#9CC6EF",
					"#B5A5D6",
					"#D6A5BD"
				],
				[
					"#E76363",
					"#F7AD6B",
					"#FFD663",
					"#94BD7B",
					"#73A5AD",
					"#6BADDE",
					"#8C7BC6",
					"#C67BA5"
				],
				[
					"#CE0000",
					"#E79439",
					"#EFC631",
					"#6BA54A",
					"#4A7B8C",
					"#3984C6",
					"#634AA5",
					"#A54A7B"
				],
				[
					"#9C0000",
					"#B56308",
					"#BD9400",
					"#397B21",
					"#104A5A",
					"#085294",
					"#311873",
					"#731842"
				],
				[
					"#630000",
					"#7B3900",
					"#846300",
					"#295218",
					"#083139",
					"#003163",
					"#21104A",
					"#4A1031"
				]
			],
			colorsName: [
				[
					"Black",
					"Tundora",
					"Dove Gray",
					"Star Dust",
					"Pale Slate",
					"Gallery",
					"Alabaster",
					"White"
				],
				[
					"Red",
					"Orange Peel",
					"Yellow",
					"Green",
					"Cyan",
					"Blue",
					"Electric Violet",
					"Magenta"
				],
				[
					"Azalea",
					"Karry",
					"Egg White",
					"Zanah",
					"Botticelli",
					"Tropical Blue",
					"Mischka",
					"Twilight"
				],
				[
					"Tonys Pink",
					"Peach Orange",
					"Cream Brulee",
					"Sprout",
					"Casper",
					"Perano",
					"Cold Purple",
					"Careys Pink"
				],
				[
					"Mandy",
					"Rajah",
					"Dandelion",
					"Olivine",
					"Gulf Stream",
					"Viking",
					"Blue Marguerite",
					"Puce"
				],
				[
					"Guardsman Red",
					"Fire Bush",
					"Golden Dream",
					"Chelsea Cucumber",
					"Smalt Blue",
					"Boston Blue",
					"Butterfly Bush",
					"Cadillac"
				],
				[
					"Sangria",
					"Mai Tai",
					"Buddha Gold",
					"Forest Green",
					"Eden",
					"Venice Blue",
					"Meteorite",
					"Claret"
				],
				[
					"Rosewood",
					"Cinnamon",
					"Olive",
					"Parsley",
					"Tiber",
					"Midnight Blue",
					"Valentino",
					"Loulou"
				]
			],
			colorButton: {
				foreColor: "#000000",
				backColor: "#FFFF00"
			},
			lineHeights: [
				"1.0",
				"1.2",
				"1.4",
				"1.5",
				"1.6",
				"1.8",
				"2.0",
				"3.0"
			],
			tableClassName: "table table-bordered",
			insertTableMaxSize: {
				col: 10,
				row: 10
			},
			dialogsInBody: false,
			dialogsFade: false,
			maximumImageFileSize: null,
			acceptImageFileTypes: "image/*",
			allowClipboardImagePasting: true,
			callbacks: {
				onBeforeCommand: null,
				onBlur: null,
				onBlurCodeview: null,
				onChange: null,
				onChangeCodeview: null,
				onDialogShown: null,
				onEnter: null,
				onFocus: null,
				onImageLinkInsert: null,
				onImageUpload: null,
				onImageUploadError: null,
				onInit: null,
				onKeydown: null,
				onKeyup: null,
				onMousedown: null,
				onMouseup: null,
				onPaste: null,
				onScroll: null
			},
			codemirror: {
				mode: "text/html",
				htmlMode: true,
				lineNumbers: true
			},
			codeviewFilter: true,
			codeviewFilterRegex: /<\/*(?:applet|b(?:ase|gsound|link)|embed|frame(?:set)?|ilayer|l(?:ayer|ink)|meta|object|s(?:cript|tyle)|t(?:itle|extarea)|xml)[^>]*?>/gi,
			codeviewIframeFilter: true,
			codeviewIframeWhitelistSrc: [],
			codeviewIframeWhitelistSrcBase: [
				"www.youtube.com",
				"www.youtube-nocookie.com",
				"www.facebook.com",
				"vine.co",
				"instagram.com",
				"player.vimeo.com",
				"www.dailymotion.com",
				"player.youku.com",
				"jumpingbean.tv",
				"v.qq.com"
			],
			keyMap: {
				pc: {
					"ESC": "escape",
					"ENTER": "insertParagraph",
					"CTRL+Z": "undo",
					"CTRL+Y": "redo",
					"TAB": "tab",
					"SHIFT+TAB": "untab",
					"CTRL+B": "bold",
					"CTRL+I": "italic",
					"CTRL+U": "underline",
					"CTRL+SHIFT+S": "strikethrough",
					"CTRL+BACKSLASH": "removeFormat",
					"CTRL+SHIFT+L": "justifyLeft",
					"CTRL+SHIFT+E": "justifyCenter",
					"CTRL+SHIFT+R": "justifyRight",
					"CTRL+SHIFT+J": "justifyFull",
					"CTRL+SHIFT+NUM7": "insertUnorderedList",
					"CTRL+SHIFT+NUM8": "insertOrderedList",
					"CTRL+LEFTBRACKET": "outdent",
					"CTRL+RIGHTBRACKET": "indent",
					"CTRL+NUM0": "formatPara",
					"CTRL+NUM1": "formatH1",
					"CTRL+NUM2": "formatH2",
					"CTRL+NUM3": "formatH3",
					"CTRL+NUM4": "formatH4",
					"CTRL+NUM5": "formatH5",
					"CTRL+NUM6": "formatH6",
					"CTRL+ENTER": "insertHorizontalRule",
					"CTRL+K": "linkDialog.show"
				},
				mac: {
					"ESC": "escape",
					"ENTER": "insertParagraph",
					"CMD+Z": "undo",
					"CMD+SHIFT+Z": "redo",
					"TAB": "tab",
					"SHIFT+TAB": "untab",
					"CMD+B": "bold",
					"CMD+I": "italic",
					"CMD+U": "underline",
					"CMD+SHIFT+S": "strikethrough",
					"CMD+BACKSLASH": "removeFormat",
					"CMD+SHIFT+L": "justifyLeft",
					"CMD+SHIFT+E": "justifyCenter",
					"CMD+SHIFT+R": "justifyRight",
					"CMD+SHIFT+J": "justifyFull",
					"CMD+SHIFT+NUM7": "insertUnorderedList",
					"CMD+SHIFT+NUM8": "insertOrderedList",
					"CMD+LEFTBRACKET": "outdent",
					"CMD+RIGHTBRACKET": "indent",
					"CMD+NUM0": "formatPara",
					"CMD+NUM1": "formatH1",
					"CMD+NUM2": "formatH2",
					"CMD+NUM3": "formatH3",
					"CMD+NUM4": "formatH4",
					"CMD+NUM5": "formatH5",
					"CMD+NUM6": "formatH6",
					"CMD+ENTER": "insertHorizontalRule",
					"CMD+K": "linkDialog.show"
				}
			},
			icons: {
				"align": "note-icon-align",
				"alignCenter": "note-icon-align-center",
				"alignJustify": "note-icon-align-justify",
				"alignLeft": "note-icon-align-left",
				"alignRight": "note-icon-align-right",
				"rowBelow": "note-icon-row-below",
				"colBefore": "note-icon-col-before",
				"colAfter": "note-icon-col-after",
				"rowAbove": "note-icon-row-above",
				"rowRemove": "note-icon-row-remove",
				"colRemove": "note-icon-col-remove",
				"indent": "note-icon-align-indent",
				"outdent": "note-icon-align-outdent",
				"arrowsAlt": "note-icon-arrows-alt",
				"bold": "note-icon-bold",
				"caret": "note-icon-caret",
				"circle": "note-icon-circle",
				"close": "note-icon-close",
				"code": "note-icon-code",
				"eraser": "note-icon-eraser",
				"floatLeft": "note-icon-float-left",
				"floatRight": "note-icon-float-right",
				"font": "note-icon-font",
				"frame": "note-icon-frame",
				"italic": "note-icon-italic",
				"link": "note-icon-link",
				"unlink": "note-icon-chain-broken",
				"magic": "note-icon-magic",
				"menuCheck": "note-icon-menu-check",
				"minus": "note-icon-minus",
				"orderedlist": "note-icon-orderedlist",
				"pencil": "note-icon-pencil",
				"picture": "note-icon-picture",
				"question": "note-icon-question",
				"redo": "note-icon-redo",
				"rollback": "note-icon-rollback",
				"square": "note-icon-square",
				"strikethrough": "note-icon-strikethrough",
				"subscript": "note-icon-subscript",
				"superscript": "note-icon-superscript",
				"table": "note-icon-table",
				"textHeight": "note-icon-text-height",
				"trash": "note-icon-trash",
				"underline": "note-icon-underline",
				"undo": "note-icon-undo",
				"unorderedlist": "note-icon-unorderedlist",
				"video": "note-icon-video"
			}
		}
	});
	//#endregion
	//#region src/js/renderer.js
	var Renderer = class {
		constructor(markup, children, options, callback) {
			this.markup = markup;
			this.children = children;
			this.options = options;
			this.callback = callback;
		}
		render($parent) {
			const $node = $$($$.parseHTML(this.markup));
			if (this.options && this.options.contents) $node.html(this.options.contents);
			if (this.options && this.options.className) $node.addClass(this.options.className);
			if (this.options && this.options.data) $$.each(this.options.data, (k, v) => {
				$node.attr("data-" + k, v);
			});
			if (this.options && this.options.click) $node.on("click", this.options.click);
			if (this.children) {
				const $container = $node.find(".note-children-container");
				this.children.forEach((child) => {
					child.render($container.length ? $container : $node);
				});
			}
			if (this.callback) this.callback($node, this.options);
			if (this.options && this.options.callback) this.options.callback($node);
			if ($parent) $parent.append($node);
			return $node;
		}
	};
	var renderer_default = { create: (markup, callback) => {
		return function() {
			const firstArg = arguments[0];
			const secondArg = arguments[1];
			const hasChildrenArray = Array.isArray(firstArg);
			const options = typeof secondArg === "object" ? secondArg : hasChildrenArray ? void 0 : firstArg;
			let children = hasChildrenArray ? firstArg : [];
			if (options && options.children) children = options.children;
			return new Renderer(markup, children, options, callback);
		};
	} };
	//#endregion
	//#region src/js/icons-svg.js
	var rawIcons = /* #__PURE__ */ Object.assign({
		"../font/icons/align-center.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" preserveAspectRatio=\"xMidYMid\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill: #000;\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path d=\"M1005.873,135.999 L17.000,135.999 L17.000,286.464 L1005.873,286.464 L1005.873,135.999 ZM853.738,587.386 L853.738,436.925 L169.135,436.925 L169.135,587.386 L853.738,587.386 ZM17.434,737.787 L17.434,888.000 L1006.000,888.000 L1006.000,737.787 L17.434,737.787 Z\" class=\"cls-1\"/>\n</svg>\n",
		"../font/icons/align-indent.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" preserveAspectRatio=\"xMidYMid\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill: #000;\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path d=\"M10.989,129.999 L10.989,283.817 L1013.000,283.817 L1013.000,129.999 L10.989,129.999 ZM473.108,588.303 L1012.999,588.303 L1012.999,436.108 L473.108,436.108 L473.108,588.303 L473.108,588.303 ZM473.108,892.792 L1012.999,892.792 L1012.999,740.550 L473.108,740.550 L473.108,892.792 L473.108,892.792 ZM47.458,439.405 C68.401,451.885 288.316,631.710 306.015,642.923 C321.884,652.994 322.166,676.965 306.015,687.013 C281.408,702.313 62.619,881.216 48.187,890.077 C30.201,901.151 11.992,887.071 11.992,868.146 L11.992,461.202 C11.995,440.356 32.119,430.242 47.458,439.405 Z\" class=\"cls-1\"/>\n</svg>\n",
		"../font/icons/align-justify.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" preserveAspectRatio=\"xMidYMid\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill: #000;\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path d=\"M1005.873,135.999 L17.000,135.999 L17.000,286.464 L1005.873,286.464 L1005.873,135.999 ZM1005.873,436.925 L17.000,436.925 L17.000,587.386 L1005.873,587.386 L1005.873,436.925 ZM17.434,737.787 L17.434,888.000 L1006.000,888.000 L1006.000,737.787 L17.434,737.787 Z\" class=\"cls-1\"/>\n</svg>\n",
		"../font/icons/align-left.svg": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generator: Adobe Illustrator 16.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n	 width=\"1024px\" height=\"1024px\" viewBox=\"0 0 1024 1024\" enable-background=\"new 0 0 1024 1024\" xml:space=\"preserve\">\n<g>\n	<g>\n		<path fill=\"#010202\" d=\"M929.51,135.727H17.704v151.855H929.51V135.727z M777.555,437.932H17.704v150.254h759.847L777.555,437.932\n			L777.555,437.932z M17.704,738.488V888.79h988.593V738.488H17.704z\"/>\n	</g>\n</g>\n</svg>\n",
		"../font/icons/align-outdent.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" preserveAspectRatio=\"xMidYMid\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill: #000;\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path d=\"M10.989,129.999 L10.989,283.817 L1013.000,283.817 L1013.000,129.999 L10.989,129.999 ZM473.108,588.303 L1012.999,588.303 L1012.999,436.108 L473.108,436.108 L473.108,588.303 L473.108,588.303 ZM473.108,892.792 L1012.999,892.792 L1012.999,740.550 L473.108,740.550 L473.108,892.792 L473.108,892.792 ZM282.568,439.002 C261.604,451.493 41.464,631.478 23.747,642.701 C7.862,652.780 7.579,676.772 23.747,686.830 C48.380,702.143 267.392,881.205 281.839,890.074 C299.843,901.157 318.071,887.064 318.071,868.123 L318.071,460.818 C318.068,439.954 297.923,429.831 282.568,439.002 Z\" class=\"cls-1\"/>\n</svg>\n",
		"../font/icons/align-right.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" preserveAspectRatio=\"xMidYMid\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill: #000;\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path d=\"M93.209,136.000 L93.209,287.842 L1007.000,287.842 L1007.000,136.000 L93.209,136.000 ZM245.234,588.421 L1007.000,588.421 L1007.000,438.180 L245.234,438.180 L245.234,588.421 ZM18.001,889.000 L1007.000,889.000 L1007.000,738.711 L18.001,738.711 L18.001,889.000 Z\" class=\"cls-1\"/>\n</svg>\n",
		"../font/icons/align.svg": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generator: Adobe Illustrator 16.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n	 width=\"1024px\" height=\"1024px\" viewBox=\"0 0 1024 1024\" enable-background=\"new 0 0 1024 1024\" xml:space=\"preserve\">\n<path d=\"M63.979,588.966V445.989h606.016v142.977H63.979z M64.008,160.015h770.99v143.971H64.008V160.015z M925.011,873.015H64.008\n	V729.98h861.003V873.015z\"/>\n</svg>\n",
		"../font/icons/arrow-circle-down.svg": "<svg width=\"1792\" height=\"1792\" viewBox=\"0 0 1792 1792\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M1412 897q0-27-18-45l-91-91q-18-18-45-18t-45 18l-189 189v-502q0-26-19-45t-45-19h-128q-26 0-45 19t-19 45v502l-189-189q-19-19-45-19t-45 19l-91 91q-18 18-18 45t18 45l362 362 91 91q18 18 45 18t45-18l91-91 362-362q18-18 18-45zm252-1q0 209-103 385.5t-279.5 279.5-385.5 103-385.5-103-279.5-279.5-103-385.5 103-385.5 279.5-279.5 385.5-103 385.5 103 279.5 279.5 103 385.5z\"/></svg>",
		"../font/icons/arrow-circle-left.svg": "<svg width=\"1792\" height=\"1792\" viewBox=\"0 0 1792 1792\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M1408 960v-128q0-26-19-45t-45-19h-502l189-189q19-19 19-45t-19-45l-91-91q-18-18-45-18t-45 18l-362 362-91 91q-18 18-18 45t18 45l91 91 362 362q18 18 45 18t45-18l91-91q18-18 18-45t-18-45l-189-189h502q26 0 45-19t19-45zm256-64q0 209-103 385.5t-279.5 279.5-385.5 103-385.5-103-279.5-279.5-103-385.5 103-385.5 279.5-279.5 385.5-103 385.5 103 279.5 279.5 103 385.5z\"/></svg>",
		"../font/icons/arrow-circle-right.svg": "<svg width=\"1792\" height=\"1792\" viewBox=\"0 0 1792 1792\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M1413 896q0-27-18-45l-91-91-362-362q-18-18-45-18t-45 18l-91 91q-18 18-18 45t18 45l189 189h-502q-26 0-45 19t-19 45v128q0 26 19 45t45 19h502l-189 189q-19 19-19 45t19 45l91 91q18 18 45 18t45-18l362-362 91-91q18-18 18-45zm251 0q0 209-103 385.5t-279.5 279.5-385.5 103-385.5-103-279.5-279.5-103-385.5 103-385.5 279.5-279.5 385.5-103 385.5 103 279.5 279.5 103 385.5z\"/></svg>",
		"../font/icons/arrow-circle-up.svg": "<svg width=\"1792\" height=\"1792\" viewBox=\"0 0 1792 1792\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M1412 895q0-27-18-45l-362-362-91-91q-18-18-45-18t-45 18l-91 91-362 362q-18 18-18 45t18 45l91 91q18 18 45 18t45-18l189-189v502q0 26 19 45t45 19h128q26 0 45-19t19-45v-502l189 189q19 19 45 19t45-19l91-91q18-18 18-45zm252 1q0 209-103 385.5t-279.5 279.5-385.5 103-385.5-103-279.5-279.5-103-385.5 103-385.5 279.5-279.5 385.5-103 385.5 103 279.5 279.5 103 385.5z\"/></svg>",
		"../font/icons/arrows-alt.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" preserveAspectRatio=\"xMidYMid\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill: #241f20;\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path d=\"M837.145,253.759 L960.985,376.234 L960.962,68.043 L649.512,68.025 L773.407,190.643 L512.001,449.497 L250.597,190.644 L374.284,68.005 L63.042,68.007 L63.043,376.234 L186.856,253.762 L448.259,512.615 L193.137,765.250 L63.009,636.616 L63.047,956.987 L386.773,957.000 L256.875,828.366 L512.000,575.732 L767.129,828.366 L637.230,957.000 L960.948,956.987 L960.926,636.616 L830.863,765.250 L575.742,512.615 L837.145,253.759 Z\" class=\"cls-1\"/>\n</svg>\n",
		"../font/icons/arrows-h.svg": "<svg width=\"1792\" height=\"1792\" viewBox=\"0 0 1792 1792\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M1792 896q0 26-19 45l-256 256q-19 19-45 19t-45-19-19-45v-128h-1024v128q0 26-19 45t-45 19-45-19l-256-256q-19-19-19-45t19-45l256-256q19-19 45-19t45 19 19 45v128h1024v-128q0-26 19-45t45-19 45 19l256 256q19 19 19 45z\"/></svg>",
		"../font/icons/arrows-v.svg": "<svg width=\"1792\" height=\"1792\" viewBox=\"0 0 1792 1792\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M1216 320q0 26-19 45t-45 19h-128v1024h128q26 0 45 19t19 45-19 45l-256 256q-19 19-45 19t-45-19l-256-256q-19-19-19-45t19-45 45-19h128v-1024h-128q-26 0-45-19t-19-45 19-45l256-256q19-19 45-19t45 19l256 256q19 19 19 45z\"/></svg>",
		"../font/icons/bold.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" preserveAspectRatio=\"xMidYMid\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill: #000;\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path d=\"M804.888,401.892 C843.584,366.065 862.937,322.286 862.937,270.577 C862.937,202.087 833.630,147.995 775.010,108.301 C716.386,68.614 606.469,48.762 445.268,48.762 L394.438,48.762 L36.535,58.970 L36.535,134.496 C87.370,134.496 120.343,142.439 135.459,158.309 C150.571,174.195 158.124,203.895 158.124,247.441 L158.124,788.361 C158.124,833.266 150.108,863.321 134.082,878.514 C118.046,893.714 85.535,901.307 36.535,901.307 L36.535,976.833 L524.958,976.833 C660.974,976.833 758.285,955.296 816.914,912.195 C875.529,869.106 904.841,810.134 904.841,735.289 C904.841,668.607 881.941,614.516 836.144,573.013 C790.348,531.511 721.651,502.590 630.063,486.260 C707.913,465.849 766.183,437.732 804.888,401.892 ZM401.996,129.054 C451.453,129.054 488.890,132.688 514.310,139.938 C539.725,147.200 560.219,163.306 575.793,188.245 C591.357,213.200 599.146,247.220 599.146,290.310 C599.146,347.918 586.786,388.401 562.055,411.757 C537.323,435.125 499.769,446.797 449.392,446.797 L401.996,446.797 L401.996,129.054 ZM446.646,529.810 C495.183,529.810 531.832,534.571 556.558,544.101 C581.289,553.623 600.751,572.107 614.951,599.551 C629.143,626.999 636.243,664.985 636.243,713.516 C636.243,774.307 625.359,819.893 603.614,850.274 C581.860,880.672 549.227,895.864 505.728,895.864 C477.784,895.864 456.148,891.442 440.805,882.597 C425.458,873.752 415.154,862.762 409.894,849.597 C404.624,836.448 401.996,817.172 401.996,791.764 L401.996,529.810 L446.646,529.810 Z\" class=\"cls-1\"/>\n</svg>\n",
		"../font/icons/caret.svg": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generator: Adobe Illustrator 16.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n	 width=\"1024px\" height=\"1024px\" viewBox=\"0 0 1024 1024\" enable-background=\"new 0 0 1024 1024\" xml:space=\"preserve\">\n<path d=\"M122.674,347.863c23.249,0,401.35,0,416.049,0c23.247,0,29.402,23.246,23.247,37.945\n	c-8.547,14.704-190.075,256.057-204.776,279.303c-8.545,14.701-37.948,14.701-46.494,0C296,641.865,114.127,409.057,105.924,385.808\n	C93.274,368.714,101.821,347.863,122.674,347.863z\"/>\n</svg>\n",
		"../font/icons/chain-broken.svg": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generator: Adobe Illustrator 16.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n	 width=\"1024px\" height=\"1024px\" viewBox=\"0 0 1024 1024\" enable-background=\"new 0 0 1024 1024\" xml:space=\"preserve\">\n<g>\n	<g>\n		<g>\n			<path fill=\"#010202\" d=\"M362.776-44.529c-15.135-25.854-51.752-32.912-77.83-18.056c-26.095,14.861-39.805,50.604-24.67,76.458\n				l75.941,122.108c15.125,25.838,53.354,31.993,79.43,17.132c26.094-14.858,38.19-49.702,23.064-75.543L362.776-44.529z\"/>\n		</g>\n	</g>\n	<g>\n		<g>\n			<path fill=\"#010202\" d=\"M575.588,77.57c-15.126,25.841-3.029,60.685,23.064,75.543c26.075,14.861,64.305,8.707,79.43-17.132\n				l75.941-122.108c15.135-25.854,1.425-61.597-24.67-76.458c-26.078-14.856-62.695-7.798-77.83,18.056L575.588,77.57z\"/>\n		</g>\n	</g>\n</g>\n<g>\n	<g>\n		<g>\n			<path fill=\"#010202\" d=\"M438.711,943.173c15.126-25.841,3.029-60.685-23.064-75.543c-26.075-14.861-64.305-8.706-79.43,17.132\n				l-75.941,122.108c-15.135,25.854-1.425,61.597,24.67,76.458c26.078,14.855,62.695,7.798,77.83-18.057L438.711,943.173z\"/>\n		</g>\n	</g>\n	<g>\n		<g>\n			<path fill=\"#010202\" d=\"M651.524,1065.271c15.135,25.854,51.752,32.912,77.83,18.057c26.095-14.861,39.805-50.604,24.67-76.458\n				l-75.941-122.108c-15.125-25.838-53.354-31.993-79.43-17.132c-26.094,14.858-38.19,49.702-23.064,75.543L651.524,1065.271z\"/>\n		</g>\n	</g>\n</g>\n<g>\n	<g>\n		<path fill=\"#010202\" d=\"M823.22,222.293l-196.119,0.24c-37.265,0-67.438,29.933-67.556,66.596\n			c0,36.785,30.051,66.477,67.317,66.477l196.117-0.24c87.271-0.119,158.194,69.841,158.075,156.034\n			c-0.117,86.189-71.162,156.393-158.555,156.393l-196.119,0.24c-37.265,0-67.438,29.935-67.438,66.599\n			c0,36.784,30.054,66.475,67.318,66.475l196.115-0.241c161.685-0.239,293.315-130.188,293.555-289.706\n			C1116.293,351.76,984.903,222.053,823.22,222.293z M393.772,668.394l-192.749,0.241c-87.272,0.12-158.198-69.963-158.077-156.033\n			c0.119-86.192,71.284-156.396,158.556-156.515l192.753-0.24c37.265,0,67.437-29.932,67.437-66.596\n			c0-36.784-30.052-66.477-67.316-66.477l-192.752,0.242C39.941,223.255-91.691,353.202-91.931,512.721\n			S39.218,801.949,200.9,801.706l192.753-0.24c37.264,0,67.438-29.813,67.557-66.597\n			C461.209,698.085,431.037,668.394,393.772,668.394z\"/>\n	</g>\n</g>\n</svg>\n",
		"../font/icons/circle.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path class=\"cls-1\" d=\"M501.845-55.324c318.546,0,576.775,255.772,576.775,571.282S820.391,1087.24,501.845,1087.24-74.935,831.469-74.935,515.958,183.3-55.324,501.845-55.324Zm0,90.262c268.216,0,485.649,215.36,485.649,481.02s-217.433,481.02-485.649,481.02S16.2,781.618,16.2,515.958,233.629,34.938,501.845,34.938Z\"/>\n</svg>\n",
		"../font/icons/close.svg": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generator: Adobe Illustrator 16.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n	 width=\"1024px\" height=\"1024px\" viewBox=\"0 0 1024 1024\" enable-background=\"new 0 0 1024 1024\" xml:space=\"preserve\">\n<g>\n	<g>\n		<path fill=\"#010202\" d=\"M562.27,511.274l305.892-305.888c1.935-1.937,1.935-5.809,0-9.68l-44.532-42.592\n			c-1.936-1.937-3.868-1.937-3.868-1.937c-1.94,0-1.94,0-3.872,1.937L510,459.002l-305.887-306.13\n			c-1.939-1.936-3.873-1.936-3.873-1.936c-1.939,0-1.939,0-3.872,1.936l-44.528,44.77c-1.939,1.935-1.939,5.808,0,9.68\n			L457.728,513.21L151.84,816.92c-1.939,1.936-1.939,5.808,0,9.68l42.592,44.527c1.936,1.939,3.869,1.939,3.869,1.939\n			s1.939,0,3.873-1.939L510,563.545l305.889,305.89c1.936,1.936,3.872,1.936,3.872,1.936s1.935,0,3.868-1.936l42.592-44.532\n			c1.94-1.935,1.94-5.807,0-9.68L562.27,511.274z\"/>\n	</g>\n</g>\n</svg>\n",
		"../font/icons/code.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" preserveAspectRatio=\"xMidYMid\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill: #000;\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path d=\"M799.573,828.389 L799.573,719.346 L1122.342,549.372 L799.573,379.397 L799.573,270.358 L1237.987,510.886 L1237.987,587.857 L799.573,828.389 ZM291.448,927.098 L601.210,127.469 L718.855,127.469 L409.093,927.098 L291.448,927.098 ZM-215.002,510.886 L223.407,270.358 L223.407,379.397 L-99.357,549.372 L223.407,719.346 L223.407,828.389 L-215.002,587.857 L-215.002,510.886 Z\" class=\"cls-1\"/>\n</svg>\n",
		"../font/icons/col-after.svg": "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n<!-- Created with Inkscape (http://www.inkscape.org/) -->\n\n<svg\n   xmlns:osb=\"http://www.openswatchbook.org/uri/2009/osb\"\n   xmlns:dc=\"http://purl.org/dc/elements/1.1/\"\n   xmlns:cc=\"http://creativecommons.org/ns#\"\n   xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\"\n   xmlns:svg=\"http://www.w3.org/2000/svg\"\n   xmlns=\"http://www.w3.org/2000/svg\"\n   xmlns:xlink=\"http://www.w3.org/1999/xlink\"\n   xmlns:sodipodi=\"http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd\"\n   xmlns:inkscape=\"http://www.inkscape.org/namespaces/inkscape\"\n   width=\"3.9521849mm\"\n   height=\"3.9511111mm\"\n   viewBox=\"0 0 14.003805 14\"\n   id=\"svg3446\"\n   version=\"1.1\"\n   inkscape:version=\"0.91 r13725\"\n   sodipodi:docname=\"col-after.svg\">\n  <defs\n     id=\"defs3448\">\n    <linearGradient\n       id=\"linearGradient4209\"\n       osb:paint=\"solid\">\n      <stop\n         style=\"stop-color:#ffffff;stop-opacity:1;\"\n         offset=\"0\"\n         id=\"stop4211\" />\n    </linearGradient>\n    <linearGradient\n       inkscape:collect=\"always\"\n       xlink:href=\"#linearGradient4209\"\n       id=\"linearGradient3671\"\n       gradientUnits=\"userSpaceOnUse\"\n       gradientTransform=\"matrix(0.0633074,0,0,0.0633074,2746.9779,180.3852)\"\n       x1=\"252.42857\"\n       y1=\"91.944138\"\n       x2=\"379.79977\"\n       y2=\"91.944138\" />\n  </defs>\n  <sodipodi:namedview\n     id=\"base\"\n     pagecolor=\"#ffffff\"\n     bordercolor=\"#666666\"\n     borderopacity=\"1.0\"\n     inkscape:pageopacity=\"0.0\"\n     inkscape:pageshadow=\"2\"\n     inkscape:zoom=\"15.839192\"\n     inkscape:cx=\"-14.589889\"\n     inkscape:cy=\"25.694683\"\n     inkscape:document-units=\"px\"\n     inkscape:current-layer=\"layer1\"\n     showgrid=\"false\"\n     fit-margin-top=\"0\"\n     fit-margin-left=\"0\"\n     fit-margin-right=\"0\"\n     fit-margin-bottom=\"0\"\n     inkscape:window-width=\"1854\"\n     inkscape:window-height=\"1057\"\n     inkscape:window-x=\"1424\"\n     inkscape:window-y=\"-8\"\n     inkscape:window-maximized=\"1\" />\n  <metadata\n     id=\"metadata3451\">\n    <rdf:RDF>\n      <cc:Work\n         rdf:about=\"\">\n        <dc:format>image/svg+xml</dc:format>\n        <dc:type\n           rdf:resource=\"http://purl.org/dc/dcmitype/StillImage\" />\n        <dc:title></dc:title>\n      </cc:Work>\n    </rdf:RDF>\n  </metadata>\n  <g\n     inkscape:label=\"Camada 1\"\n     inkscape:groupmode=\"layer\"\n     id=\"layer1\"\n     transform=\"translate(728.278,112.5011)\">\n    <g\n       transform=\"matrix(0,1,-1,0,-531.8777,-2872.4914)\"\n       id=\"g3610-6\">\n      <path\n         style=\"stroke:url(#linearGradient3671);stroke-width:0;stroke-miterlimit:4;stroke-dasharray:none\"\n         inkscape:connector-curvature=\"0\"\n         d=\"m 2771.022,186.4283 q 0,0.264 -0.1915,0.4658 l -0.3882,0.3882 q -0.1966,0.1965 -0.4709,0.1965 -0.2795,0 -0.4658,-0.1965 l -1.5217,-1.5164 0,3.6436 q 0,0.2691 -0.194,0.4372 -0.1941,0.1683 -0.4684,0.1683 l -0.6625,0 q -0.2743,0 -0.4684,-0.1683 -0.1941,-0.1681 -0.1941,-0.4372 l 0,-3.6436 -1.5216,1.5164 q -0.1863,0.1965 -0.4658,0.1965 -0.2795,0 -0.4658,-0.1965 l -0.3882,-0.3882 q -0.1966,-0.1967 -0.1966,-0.4658 0,-0.2742 0.1966,-0.471 l 3.3693,-3.3692 q 0.1812,-0.1916 0.4658,-0.1916 0.2795,0 0.471,0.1916 l 3.3693,3.3692 q 0.1915,0.2019 0.1915,0.471 z\"\n         id=\"path3400-4-4-5-3\" />\n      <path\n         id=\"polygon3366-49-8-3-2\"\n         d=\"m 2773.9903,191.0823 c 0,-0.2901 -0.1688,-0.5229 -0.3789,-0.5229 l -13.2422,0 c -0.21,0 -0.3789,0.2328 -0.3789,0.5229 l 0,4.7928 c 0,0.29 0.1689,0.5252 0.3789,0.5252 l 13.2422,0 c 0.2101,0 0.3789,-0.2352 0.3789,-0.5252 l 0,-4.7928 z m -1.1582,0.687 0,3.4211 -3.2168,0 0,-3.4211 3.2168,0 z m -4.2852,0 0,3.4211 -3.2148,0 0,-3.4211 3.2148,0 z m -4.2832,0 0,3.4211 -3.2148,0 0,-3.4211 3.2148,0 z\"\n         style=\"clip-rule:evenodd;fill:#000000;fill-rule:evenodd;image-rendering:optimizeQuality;shape-rendering:geometricPrecision;text-rendering:geometricPrecision\"\n         inkscape:connector-curvature=\"0\" />\n    </g>\n  </g>\n</svg>\n",
		"../font/icons/col-before.svg": "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n<!-- Created with Inkscape (http://www.inkscape.org/) -->\n<svg id=\"svg3446\" xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:osb=\"http://www.openswatchbook.org/uri/2009/osb\" height=\"3.9511mm\" width=\"3.9522mm\" version=\"1.1\" xmlns:cc=\"http://creativecommons.org/ns#\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" viewBox=\"0 0 14.003805 14\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\">\n <metadata id=\"metadata3451\">\n  <rdf:RDF>\n   <cc:Work rdf:about=\"\">\n    <dc:format>image/svg+xml</dc:format>\n    <dc:type rdf:resource=\"http://purl.org/dc/dcmitype/StillImage\"/>\n    <dc:title/>\n   </cc:Work>\n  </rdf:RDF>\n </metadata>\n <g id=\"layer1\" transform=\"translate(785.53 142.75)\">\n  <g id=\"g3610-68\" transform=\"matrix(0 -1 1 0 -967.93 2631.2)\">\n   <path id=\"path3400-4-4-5-65\" d=\"m2771 186.43q0 0.264-0.1915 0.4658l-0.3882 0.3882q-0.1966 0.1965-0.4709 0.1965-0.2795 0-0.4658-0.1965l-1.5217-1.5164v3.6436q0 0.2691-0.194 0.4372-0.1941 0.1683-0.4684 0.1683h-0.6625q-0.2743 0-0.4684-0.1683-0.1941-0.1681-0.1941-0.4372v-3.6436l-1.5216 1.5164q-0.1863 0.1965-0.4658 0.1965t-0.4658-0.1965l-0.3882-0.3882q-0.1966-0.1967-0.1966-0.4658 0-0.2742 0.1966-0.471l3.3693-3.3692q0.1812-0.1916 0.4658-0.1916 0.2795 0 0.471 0.1916l3.3693 3.3692q0.1915 0.2019 0.1915 0.471z\" stroke-width=\"0\"/>\n   <path id=\"polygon3366-49-8-3-1\" style=\"image-rendering:optimizeQuality;shape-rendering:geometricPrecision\" d=\"m2774 191.08c0-0.2901-0.1688-0.5229-0.3789-0.5229h-13.242c-0.21 0-0.3789 0.2328-0.3789 0.5229v4.7928c0 0.29 0.1689 0.5252 0.3789 0.5252h13.242c0.2101 0 0.3789-0.2352 0.3789-0.5252v-4.7928zm-1.1582 0.687v3.4211h-3.2168v-3.4211h3.2168zm-4.2852 0v3.4211h-3.2148v-3.4211h3.2148zm-4.2832 0v3.4211h-3.2148v-3.4211h3.2148z\" fill-rule=\"evenodd\" clip-rule=\"evenodd\"/>\n  </g>\n </g>\n</svg>\n",
		"../font/icons/col-remove.svg": "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n<!-- Created with Inkscape (http://www.inkscape.org/) -->\n<svg id=\"svg3446\" xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:osb=\"http://www.openswatchbook.org/uri/2009/osb\" height=\"3.9511mm\" width=\"3.9496mm\" version=\"1.1\" xmlns:cc=\"http://creativecommons.org/ns#\" viewBox=\"0 0 13.99474 14\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\">\n <metadata id=\"metadata3451\">\n  <rdf:RDF>\n   <cc:Work rdf:about=\"\">\n    <dc:format>image/svg+xml</dc:format>\n    <dc:type rdf:resource=\"http://purl.org/dc/dcmitype/StillImage\"/>\n    <dc:title/>\n   </cc:Work>\n  </rdf:RDF>\n </metadata>\n <g id=\"layer1\" transform=\"translate(732.42 107.67)\">\n  <g id=\"g3692-8\" transform=\"matrix(0 1 -1 0 -536.02 -2867.7)\">\n   <path id=\"path5085-1-1\" d=\"m2764.7 190q-0.2558 0-0.4348-0.17906l-0.8698-0.86975q-0.1791-0.17906-0.1791-0.43487t0.1791-0.43487l1.8802-1.8802-1.8802-1.8802q-0.1791-0.17906-0.1791-0.43487t0.1791-0.43487l0.8698-0.86975q0.179-0.17906 0.4348-0.17906t0.4349 0.17906l1.8802 1.8802 1.8802-1.8802q0.179-0.17906 0.4348-0.17906t0.4349 0.17906l0.8698 0.86975q0.179 0.17906 0.179 0.43487t-0.179 0.43487l-1.8802 1.8802 1.8802 1.8802q0.179 0.17906 0.179 0.43487t-0.179 0.43487l-0.8698 0.86975q-0.1791 0.17906-0.4349 0.17906t-0.4348-0.17906l-1.8802-1.8802-1.8802 1.8802q-0.1791 0.17906-0.4349 0.17906z\"/>\n   <path id=\"polygon3366-49-8-3-07\" style=\"image-rendering:optimizeQuality;shape-rendering:geometricPrecision\" d=\"m2774 191.08c0-0.2901-0.1688-0.5229-0.3789-0.5229h-13.242c-0.21 0-0.3789 0.2328-0.3789 0.5229v4.7928c0 0.29 0.1689 0.5252 0.3789 0.5252h13.242c0.2101 0 0.3789-0.2352 0.3789-0.5252v-4.7928zm-1.1582 0.687v3.4211h-3.2168v-3.4211h3.2168zm-4.2852 0v3.4211h-3.2148v-3.4211h3.2148zm-4.2832 0v3.4211h-3.2148v-3.4211h3.2148z\" fill-rule=\"evenodd\" clip-rule=\"evenodd\"/>\n  </g>\n </g>\n</svg>\n",
		"../font/icons/eraser.svg": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generator: Adobe Illustrator 16.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n	 width=\"1024px\" height=\"1024px\" viewBox=\"0 0 1024 1024\" enable-background=\"new 0 0 1024 1024\" xml:space=\"preserve\">\n<g>\n	<g>\n		<path fill=\"#010202\" d=\"M809.47,113.026H383.481c-67.22,0-121.711,53.92-121.711,120.442L79.209,835.674\n			c0,66.521,54.492,120.442,121.709,120.442h425.986c67.222,0,121.713-53.923,121.713-120.442l182.563-602.206\n			C931.181,166.946,876.687,113.026,809.47,113.026z M652.267,870.801H185.705l60.855-276.013h466.559L652.267,870.801z\"/>\n	</g>\n</g>\n</svg>\n",
		"../font/icons/float-left.svg": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generator: Adobe Illustrator 23.0.1, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n	 viewBox=\"0 0 1024 1024\" style=\"enable-background:new 0 0 1024 1024;\" xml:space=\"preserve\">\n<style type=\"text/css\">\n	.st0{fill-rule:evenodd;clip-rule:evenodd;}\n</style>\n<g>\n	<path class=\"st0\" d=\"M9,737.8v153.8h1002V737.8H9z M555.3,586.3H1011V434.1H555.3V586.3L555.3,586.3z M555.3,280.2H1011V128H555.3\n		V280.2L555.3,280.2z M464.1,128L464.1,128H9v456.7h455.1V128\"/>\n</g>\n</svg>\n",
		"../font/icons/float-none.svg": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generator: Adobe Illustrator 23.0.1, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n	 viewBox=\"0 0 1024 1024\" style=\"enable-background:new 0 0 1024 1024;\" xml:space=\"preserve\">\n<style type=\"text/css\">\n	.st0{fill:#010202;}\n</style>\n<g>\n	<g>\n		<path class=\"st0\" d=\"M1006.3,135.7H17.7v151.9h988.6V135.7z M17.7,738.5v150.3h988.6V738.5H17.7z\"/>\n	</g>\n	<polyline class=\"st0\" points=\"759.1,372.2 759.1,372.2 264.9,372.2 264.9,651.8 759.1,651.8 759.1,372.2 	\"/>\n</g>\n</svg>\n",
		"../font/icons/float-right.svg": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generator: Adobe Illustrator 23.0.1, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n	 viewBox=\"0 0 1024 1024\" style=\"enable-background:new 0 0 1024 1024;\" xml:space=\"preserve\">\n<style type=\"text/css\">\n	.st0{fill-rule:evenodd;clip-rule:evenodd;}\n</style>\n<g>\n	<path class=\"st0\" d=\"M1010.7,128L1010.7,128H555.6v456.7h455.1V128 M9,737.8v153.8h1002V737.8H9z M8.7,586.3h455.7V434.1H8.7V586.3\n		L8.7,586.3z M8.7,280.2h455.7V128H8.7V280.2L8.7,280.2z\"/>\n</g>\n</svg>\n",
		"../font/icons/font.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" preserveAspectRatio=\"xMidYMid\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill: #000;\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path d=\"M573.459,743.967 L601.655,814.844 L611.052,837.039 C619.730,855.657 624.065,870.689 624.065,882.145 C624.065,895.035 618.759,905.661 608.164,914.005 C597.553,922.362 570.318,926.535 526.469,926.535 L526.469,1006.008 L1013.015,1006.008 L1013.015,926.535 C990.358,926.535 966.749,919.016 942.164,903.983 C917.585,888.947 890.112,844.201 859.751,769.742 L552.495,17.984 L467.908,17.984 L166.437,770.455 C124.505,874.518 72.691,926.535 11.003,926.535 L11.003,1006.008 L334.884,1006.008 L334.884,926.535 C298.738,926.535 272.712,921.880 256.806,912.575 C240.900,903.266 232.949,886.921 232.949,863.532 C232.949,849.694 239.691,825.830 253.189,791.937 L271.988,743.967 L573.459,743.967 ZM418.748,371.669 L540.929,661.633 L303.077,661.633 L418.748,371.669 Z\" class=\"cls-1\"/>\n</svg>\n",
		"../font/icons/frame.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path id=\"Rounded_Rectangle_8\" data-name=\"Rounded Rectangle 8\" class=\"cls-1\" d=\"M33.324,124.705H984.236a64,64,0,0,1,64,64V843.319a64,64,0,0,1-64,64H33.324a64,64,0,0,1-64-64V188.705A64,64,0,0,1,33.324,124.705Zm137.33,70.961H840.366c74.689,0,137.484-11.46,137.484,62.519V751.656c0,73.975-62.8,87.175-137.484,87.175H170.654c-74.688,0-130.737-13.2-130.737-87.175V258.185C39.917,184.206,95.966,195.666,170.654,195.666ZM-110.419-17.645H1129.55a64,64,0,0,1,64,64V985.6a64,64,0,0,1-64,64H-110.419a64,64,0,0,1-64-64V46.355A64,64,0,0,1-110.419-17.645ZM93.432,52.331h833.1c98.331,0,193.791-6.99,193.791,90.4V803.587c0,157.53-39.24,176.35-193.791,176.35H93.432c-150.047,0-196.033-27.731-196.033-176.35V142.735C-102.6,45.341-4.9,52.331,93.432,52.331Zm1049.3-27.716a35.4,35.4,0,0,1,0,50.4l-112.18,111.1a36.214,36.214,0,0,1-50.874,0,35.385,35.385,0,0,1,0-50.394l112.164-111.1A36.234,36.234,0,0,1,1142.73,24.616ZM40.88,190.263a35.4,35.4,0,0,0,0-50.4L-71.288,28.766a36.224,36.224,0,0,0-50.882,0,35.4,35.4,0,0,0,0,50.4L-10,190.263A36.226,36.226,0,0,0,40.88,190.263ZM1142.73,1007.65a35.4,35.4,0,0,0,0-50.4l-112.18-111.1a36.214,36.214,0,0,0-50.874,0,35.39,35.39,0,0,0,0,50.4l112.164,111.1A36.228,36.228,0,0,0,1142.73,1007.65ZM40.88,842.005a35.4,35.4,0,0,1,0,50.4L-71.288,1003.5a36.218,36.218,0,0,1-50.882,0,35.392,35.392,0,0,1,0-50.392L-10,842.005A36.226,36.226,0,0,1,40.88,842.005Z\"/>\n</svg>\n",
		"../font/icons/italic.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" preserveAspectRatio=\"xMidYMid\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill: #000;\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path d=\"M421.903,47.502 L401.526,111.534 C422.134,113.396 440.987,118.386 458.094,126.498 C475.187,134.622 483.740,152.142 483.740,179.046 C483.740,190.652 479.527,211.066 471.091,240.297 L291.199,805.870 C280.890,839.748 268.713,865.849 254.659,884.172 C240.604,902.508 216.713,911.663 182.985,911.663 L162.604,975.699 L558.929,975.699 L577.201,911.663 C550.960,911.663 528.121,906.446 508.688,896.006 C489.241,885.562 479.527,868.511 479.527,844.848 C479.527,830.470 483.740,816.731 492.176,790.283 L670.662,217.327 C679.093,190.423 687.175,169.890 694.903,155.733 C702.635,141.584 712.826,130.794 725.475,123.367 C738.123,115.952 754.041,112.002 773.257,111.534 L793.634,47.502 L421.903,47.502 Z\" class=\"cls-1\"/>\n</svg>\n",
		"../font/icons/link.svg": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generator: Adobe Illustrator 16.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n	 width=\"1024px\" height=\"1024px\" viewBox=\"0 0 1024 1024\" enable-background=\"new 0 0 1024 1024\" xml:space=\"preserve\">\n<g>\n	<g>\n		<path fill=\"#010202\" d=\"M823.22,222.293l-196.119,0.24c-37.265,0-67.438,29.933-67.556,66.596\n			c0,36.785,30.051,66.477,67.317,66.477l196.117-0.24c87.271-0.119,158.194,69.841,158.075,156.034\n			c-0.117,86.189-71.162,156.393-158.555,156.393l-196.119,0.24c-37.265,0-67.438,29.935-67.438,66.599\n			c0,36.784,30.054,66.475,67.318,66.475l196.115-0.241c161.685-0.239,293.315-130.188,293.555-289.706\n			C1116.293,351.76,984.903,222.053,823.22,222.293z M393.772,668.394l-192.749,0.241c-87.273,0.12-158.198-69.963-158.078-156.033\n			c0.12-86.192,71.284-156.396,158.556-156.515l192.752-0.24c37.265,0,67.437-29.932,67.437-66.596\n			c0-36.784-30.051-66.477-67.316-66.477l-192.751,0.242C39.941,223.255-91.691,353.202-91.931,512.721\n			S39.219,801.949,200.9,801.706l192.753-0.24c37.263,0,67.438-29.813,67.556-66.597\n			C461.209,698.085,431.038,668.394,393.772,668.394z M272.601,509.093c0,36.784,30.052,66.476,67.316,66.476l346.928-0.358\n			c37.266,0,67.439-29.934,67.558-66.598c0-36.784-30.051-66.478-67.316-66.478l-346.928,0.361\n			C302.895,442.496,272.72,472.308,272.601,509.093z\"/>\n	</g>\n</g>\n</svg>\n",
		"../font/icons/magic.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path class=\"cls-1\" d=\"M849.684,129.609L904.511,183.9,1050.77,39.032l-54.827-54.3ZM991.24,487.441h219.79V410.647l-219.79.008v76.786ZM849.684,853.314L995.943,998.181l54.827-54.289L904.511,799.022ZM27.557,39.032L173.825,183.9l54.821-54.293L82.378-15.269Zm443.712,4.655h77.524l0.01-217.671H471.278ZM-132.579,944.281L50.885,1126,533.252,648.5l-183.46-181.7ZM404.619,412.5L588.073,594.215,772.047,411.989,588.588,230.279Z\"/>\n</svg>\n",
		"../font/icons/menu-check.svg": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generator: Adobe Illustrator 16.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n	 width=\"1024px\" height=\"1024px\" viewBox=\"0 0 1024 1024\" enable-background=\"new 0 0 1024 1024\" xml:space=\"preserve\">\n<path fill=\"#010202\" d=\"M402.399,830.4L128.8,556.8V550.4L237.6,448L404,614.4l382.399-420.8l108.8,102.4v6.4L402.399,830.4\n	L402.399,830.4L402.399,830.4z\"/>\n</svg>\n",
		"../font/icons/minus.svg": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generator: Adobe Illustrator 16.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n	 width=\"1024px\" height=\"1024px\" viewBox=\"0 0 1024 1024\" enable-background=\"new 0 0 1024 1024\" xml:space=\"preserve\">\n<g>\n	<g>\n		<rect x=\"108.93\" y=\"432.341\" fill=\"#010202\" width=\"806.141\" height=\"159.071\"/>\n	</g>\n</g>\n</svg>\n",
		"../font/icons/orderedlist.svg": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generator: Adobe Illustrator 16.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n	 width=\"1024px\" height=\"1024px\" viewBox=\"0 0 1024 1024\" enable-background=\"new 0 0 1024 1024\" xml:space=\"preserve\">\n<path d=\"M83.072,779.246c31.653-22.206,76.371-43.774,76.371-87.973c0-34.427-22.838-55.464-54.488-55.464\n	c-43.655,0-57.678,44.624-57.678,82.661h-70.74c-2.552-82.131,44.609-145.454,131.813-145.454c66.493,0,124.7,42.183,124.7,112.624\n	c0,109.011-116.733,117.828-169.523,191.672h171.647V940H-31.75C-31.75,856.275,20.191,821.854,83.072,779.246z M87.426,192.544\n	H-3.921v-55.037c51.303,1.488,98.146-16.468,106.43-71.504h58.738v359.862H87.426V192.544z M1050.921,90.351H289.056v170.108\n	h761.865V90.351L1050.921,90.351z M289.781,428.395v168.558h761.97V428.395H289.781z M289.056,933.649h761.865V765.3H289.056\n	V933.649z\"/>\n</svg>\n",
		"../font/icons/pencil.svg": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generator: Adobe Illustrator 16.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n	 width=\"1024px\" height=\"1024px\" viewBox=\"0 0 1024 1024\" enable-background=\"new 0 0 1024 1024\" xml:space=\"preserve\">\n<path d=\"M100.403,576.011l-127.892,470.479L452.19,927.81l599.3-599l-352.3-351.3L100.403,576.011z M873.281,328.811\n	L389.143,812.973l-145.086,31.801l-63.754-63.58l34.259-141.311l484.627-484.671L873.281,328.811z\"/>\n</svg>\n",
		"../font/icons/picture.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" preserveAspectRatio=\"xMidYMid\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill: #000;\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path d=\"M1068.340,975.691 L-26.281,975.691 C-61.627,975.691 -90.281,947.037 -90.281,911.691 L-90.281,113.254 C-90.281,77.908 -61.627,49.254 -26.281,49.254 L1068.340,49.254 C1103.686,49.254 1132.340,77.908 1132.340,113.254 L1132.340,911.691 C1132.340,947.037 1103.686,975.691 1068.340,975.691 ZM1060.475,192.281 C1060.475,113.556 996.043,121.007 916.561,121.007 L125.033,121.007 C45.551,121.007 -18.881,113.556 -18.881,192.281 L-18.881,762.448 C-18.881,841.172 45.551,904.991 125.033,904.991 L916.561,904.991 C996.043,904.991 1060.475,841.172 1060.475,762.448 L1060.475,192.281 ZM820.368,440.468 C767.439,440.468 724.487,400.954 724.487,352.025 C724.487,303.139 767.439,263.554 820.368,263.554 C873.322,263.554 916.222,303.139 916.222,352.025 C916.222,400.954 873.322,440.468 820.368,440.468 ZM873.397,780.358 C918.029,846.441 885.494,832.253 801.185,832.253 L225.930,832.253 C141.522,832.253 101.661,842.771 137.427,772.270 L276.114,497.962 C311.786,427.437 379.266,422.747 426.053,487.463 L562.711,676.687 L600.888,601.377 C636.612,530.876 702.365,527.233 747.024,593.289 L873.397,780.358 Z\" class=\"cls-1\"/>\n</svg>\n",
		"../font/icons/question.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path id=\"Rounded_Rectangle_6\" data-name=\"Rounded Rectangle 6\" class=\"cls-1\" d=\"M418.652,985.119h194.77V798.656H418.652V985.119ZM180.886,334.113H369.145q0-53.547,31.508-103.232T507.57,181.2q76.667,0,105.595,40.326t28.918,89.361q0,42.582-25.973,78.068-14.295,20.655-37.67,38.066L531.017,463.8q-70.137,54.192-87.023,95.81T423.21,710.265H599.743q0.642-51.612,8.446-76.133,12.341-38.713,50.028-67.75L704.332,530.9q70.173-54.2,94.851-89.039,42.234-57.417,42.233-141.3,0-136.773-97.387-206.46t-244.6-69.684q-112.047,0-188.909,49.038Q188.7,150.243,180.886,334.113h0Z\"/>\n</svg>\n",
		"../font/icons/redo.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path id=\"Shape_29_copy_3\" data-name=\"Shape 29 copy 3\" class=\"cls-1\" d=\"M1181.48,193.372V728.531H616.6L771.612,580.294s21.019-239-341.56-239S-79.66,648.131-79.66,648.131s147.134-482.4,546.5-482.4S1034.35,331.559,1034.35,331.559Z\"/>\n</svg>\n",
		"../font/icons/rollback.svg": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generator: Adobe Illustrator 23.0.1, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n	 viewBox=\"0 0 1024 1024\" style=\"enable-background:new 0 0 1024 1024;\" xml:space=\"preserve\">\n<style type=\"text/css\">\n	.st0{fill-rule:evenodd;clip-rule:evenodd;}\n</style>\n<g>\n	<g>\n		<g>\n			<path class=\"st0\" d=\"M512.4,97.7v112.9c190.3,1.3,344.1,155.9,344.1,346.5c0,191.4-155.1,346.5-346.5,346.5\n				S163.5,748.4,163.5,557.1H50.6c0,253.7,205.7,459.4,459.4,459.4s459.4-205.7,459.4-459.4C969.4,304.2,765,99,512.4,97.7z\"/>\n		</g>\n		<path class=\"st0\" d=\"M486,4.4C469.4,12.7,295.8,132,281.8,139.5c-12.5,6.7-12.8,22.6,0,29.3c19.4,10.2,192.2,128.9,203.6,134.8\n			c14.2,7.4,28.6-2,28.6-14.6V18.8C514,5,498.1-1.7,486,4.4z\"/>\n	</g>\n	<polygon class=\"st0\" points=\"639.5,340.1 512.4,467.2 385.3,340.1 295.4,430 422.5,557.1 295.4,684.2 385.3,774.1 512.4,647 \n		639.5,774.1 729.4,684.2 602.3,557.1 729.4,430 	\"/>\n</g>\n</svg>\n",
		"../font/icons/row-above.svg": "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n<!-- Created with Inkscape (http://www.inkscape.org/) -->\n<svg id=\"svg3446\" xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:osb=\"http://www.openswatchbook.org/uri/2009/osb\" height=\"3.9522mm\" width=\"3.9511mm\" version=\"1.1\" xmlns:cc=\"http://creativecommons.org/ns#\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" viewBox=\"0 0 14 14.003805\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\">\n <metadata id=\"metadata3451\">\n  <rdf:RDF>\n   <cc:Work rdf:about=\"\">\n    <dc:format>image/svg+xml</dc:format>\n    <dc:type rdf:resource=\"http://purl.org/dc/dcmitype/StillImage\"/>\n    <dc:title/>\n   </cc:Work>\n  </rdf:RDF>\n </metadata>\n <g id=\"layer1\" transform=\"translate(758.78 133.09)\">\n  <g id=\"g3610-8\" transform=\"translate(-3518.8 -315.48)\">\n   <path id=\"path3400-4-4-5-4\" d=\"m2771 186.43q0 0.264-0.1915 0.4658l-0.3882 0.3882q-0.1966 0.1965-0.4709 0.1965-0.2795 0-0.4658-0.1965l-1.5217-1.5164v3.6436q0 0.2691-0.194 0.4372-0.1941 0.1683-0.4684 0.1683h-0.6625q-0.2743 0-0.4684-0.1683-0.1941-0.1681-0.1941-0.4372v-3.6436l-1.5216 1.5164q-0.1863 0.1965-0.4658 0.1965t-0.4658-0.1965l-0.3882-0.3882q-0.1966-0.1967-0.1966-0.4658 0-0.2742 0.1966-0.471l3.3693-3.3692q0.1812-0.1916 0.4658-0.1916 0.2795 0 0.471 0.1916l3.3693 3.3692q0.1915 0.2019 0.1915 0.471z\" stroke-width=\"0\"/>\n   <path id=\"polygon3366-49-8-3-5\" style=\"image-rendering:optimizeQuality;shape-rendering:geometricPrecision\" d=\"m2774 191.08c0-0.2901-0.1688-0.5229-0.3789-0.5229h-13.242c-0.21 0-0.3789 0.2328-0.3789 0.5229v4.7928c0 0.29 0.1689 0.5252 0.3789 0.5252h13.242c0.2101 0 0.3789-0.2352 0.3789-0.5252v-4.7928zm-1.1582 0.687v3.4211h-3.2168v-3.4211h3.2168zm-4.2852 0v3.4211h-3.2148v-3.4211h3.2148zm-4.2832 0v3.4211h-3.2148v-3.4211h3.2148z\" fill-rule=\"evenodd\" clip-rule=\"evenodd\"/>\n  </g>\n </g>\n</svg>\n",
		"../font/icons/row-below.svg": "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n<!-- Created with Inkscape (http://www.inkscape.org/) -->\n<svg id=\"svg3446\" xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:osb=\"http://www.openswatchbook.org/uri/2009/osb\" height=\"3.9522mm\" width=\"3.9511mm\" version=\"1.1\" xmlns:cc=\"http://creativecommons.org/ns#\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" viewBox=\"0 0 14 14.003805\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\">\n <metadata id=\"metadata3451\">\n  <rdf:RDF>\n   <cc:Work rdf:about=\"\">\n    <dc:format>image/svg+xml</dc:format>\n    <dc:type rdf:resource=\"http://purl.org/dc/dcmitype/StillImage\"/>\n    <dc:title/>\n   </cc:Work>\n  </rdf:RDF>\n </metadata>\n <g id=\"layer1\" transform=\"translate(745.96 126.95)\">\n  <g id=\"g3610-5\" transform=\"matrix(1 0 0 -1 -3506 69.446)\">\n   <path id=\"path3400-4-4-5-6\" d=\"m2771 186.43q0 0.264-0.1915 0.4658l-0.3882 0.3882q-0.1966 0.1965-0.4709 0.1965-0.2795 0-0.4658-0.1965l-1.5217-1.5164v3.6436q0 0.2691-0.194 0.4372-0.1941 0.1683-0.4684 0.1683h-0.6625q-0.2743 0-0.4684-0.1683-0.1941-0.1681-0.1941-0.4372v-3.6436l-1.5216 1.5164q-0.1863 0.1965-0.4658 0.1965t-0.4658-0.1965l-0.3882-0.3882q-0.1966-0.1967-0.1966-0.4658 0-0.2742 0.1966-0.471l3.3693-3.3692q0.1812-0.1916 0.4658-0.1916 0.2795 0 0.471 0.1916l3.3693 3.3692q0.1915 0.2019 0.1915 0.471z\" stroke-width=\"0\"/>\n   <path id=\"polygon3366-49-8-3-0\" style=\"image-rendering:optimizeQuality;shape-rendering:geometricPrecision\" d=\"m2774 191.08c0-0.2901-0.1688-0.5229-0.3789-0.5229h-13.242c-0.21 0-0.3789 0.2328-0.3789 0.5229v4.7928c0 0.29 0.1689 0.5252 0.3789 0.5252h13.242c0.2101 0 0.3789-0.2352 0.3789-0.5252v-4.7928zm-1.1582 0.687v3.4211h-3.2168v-3.4211h3.2168zm-4.2852 0v3.4211h-3.2148v-3.4211h3.2148zm-4.2832 0v3.4211h-3.2148v-3.4211h3.2148z\" fill-rule=\"evenodd\" clip-rule=\"evenodd\"/>\n  </g>\n </g>\n</svg>\n",
		"../font/icons/row-remove.svg": "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n<!-- Created with Inkscape (http://www.inkscape.org/) -->\n<svg id=\"svg3446\" xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:osb=\"http://www.openswatchbook.org/uri/2009/osb\" height=\"3.9496mm\" width=\"3.9511mm\" version=\"1.1\" xmlns:cc=\"http://creativecommons.org/ns#\" viewBox=\"0 0 14 13.99474\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\">\n <metadata id=\"metadata3451\">\n  <rdf:RDF>\n   <cc:Work rdf:about=\"\">\n    <dc:format>image/svg+xml</dc:format>\n    <dc:type rdf:resource=\"http://purl.org/dc/dcmitype/StillImage\"/>\n    <dc:title/>\n   </cc:Work>\n  </rdf:RDF>\n </metadata>\n <g id=\"layer1\" transform=\"translate(764.76 127.54)\">\n  <g id=\"g3692-9\" transform=\"translate(-3524.7 -309.95)\">\n   <path id=\"path5085-1-5\" d=\"m2764.7 190q-0.2558 0-0.4348-0.17906l-0.8698-0.86975q-0.1791-0.17906-0.1791-0.43487t0.1791-0.43487l1.8802-1.8802-1.8802-1.8802q-0.1791-0.17906-0.1791-0.43487t0.1791-0.43487l0.8698-0.86975q0.179-0.17906 0.4348-0.17906t0.4349 0.17906l1.8802 1.8802 1.8802-1.8802q0.179-0.17906 0.4348-0.17906t0.4349 0.17906l0.8698 0.86975q0.179 0.17906 0.179 0.43487t-0.179 0.43487l-1.8802 1.8802 1.8802 1.8802q0.179 0.17906 0.179 0.43487t-0.179 0.43487l-0.8698 0.86975q-0.1791 0.17906-0.4349 0.17906t-0.4348-0.17906l-1.8802-1.8802-1.8802 1.8802q-0.1791 0.17906-0.4349 0.17906z\"/>\n   <path id=\"polygon3366-49-8-3-4\" style=\"image-rendering:optimizeQuality;shape-rendering:geometricPrecision\" d=\"m2774 191.08c0-0.2901-0.1688-0.5229-0.3789-0.5229h-13.242c-0.21 0-0.3789 0.2328-0.3789 0.5229v4.7928c0 0.29 0.1689 0.5252 0.3789 0.5252h13.242c0.2101 0 0.3789-0.2352 0.3789-0.5252v-4.7928zm-1.1582 0.687v3.4211h-3.2168v-3.4211h3.2168zm-4.2852 0v3.4211h-3.2148v-3.4211h3.2148zm-4.2832 0v3.4211h-3.2148v-3.4211h3.2148z\" fill-rule=\"evenodd\" clip-rule=\"evenodd\"/>\n  </g>\n </g>\n</svg>\n",
		"../font/icons/special-character.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path id=\"_\" data-name=\"※\" class=\"cls-1\" d=\"M807.591,584.975q29.964,27.886,70.339,27.869,46.473,0,75.84-27.869t29.359-72.7q0-44.811-31.194-72.695-31.188-27.864-74-27.869-42.835,0-71.561,29.684-28.76,29.706-28.751,72.093Q777.618,557.11,807.591,584.975Zm-737.635,0q28.732,27.886,74.009,27.869,42.807,0,70.952-27.869,28.124-27.858,28.133-72.7,0-44.811-29.36-72.695-29.353-27.864-69.725-27.869-46.5,0-74.618,29.684Q41.188,471.106,41.21,513.493,41.21,557.11,69.956,584.975ZM422.872,180.3A111.5,111.5,0,0,0,445.5,212.407a103.872,103.872,0,0,0,72.783,29.684q45.243,0,73.4-29.684,28.131-29.677,28.138-72.093,0-43.617-30.582-72.695T518.286,38.541q-46.5,0-75.231,29.684-28.753,29.7-28.746,72.088A92.561,92.561,0,0,0,422.872,180.3ZM444.89,956.94q30.566,27.858,73.4,27.865,44.039,0,72.787-27.865,28.725-27.887,28.747-73.908,0-42.4-30.582-69.667T518.286,786.1q-46.5,0-75.231,28.471-28.753,28.484-28.746,69.667Q414.309,929.058,444.89,956.94ZM919.768,46.429L512.582,449.945,104.533,46.429,43.951,107.145,451.137,509.807,43.951,912.465l60.582,60.715L512.582,569.668,919.768,973.18l59.714-60.715L572.3,509.807,979.482,107.145Z\"/>\n</svg>\n",
		"../font/icons/square.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path id=\"Rounded_Rectangle_7\" data-name=\"Rounded Rectangle 7\" class=\"cls-1\" d=\"M26.188-17.645H992.877a128,128,0,0,1,128,128V923.107a128.005,128.005,0,0,1-128,128H26.188a128,128,0,0,1-128-128V110.355A128,128,0,0,1,26.188-17.645ZM97.324,53.5H920.236a128,128,0,0,1,128,128v670.47a128,128,0,0,1-128,128H97.324a128,128,0,0,1-128-128V181.5A128,128,0,0,1,97.324,53.5Z\"/>\n</svg>\n",
		"../font/icons/strikethrough.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" preserveAspectRatio=\"xMidYMid\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill: #000;\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path d=\"M999.602,572.813 L23.826,572.813 C14.990,572.813 7.826,565.650 7.826,556.813 L7.826,446.566 C7.826,437.730 14.990,430.566 23.826,430.566 L222.008,430.566 C219.520,428.463 217.056,426.350 214.637,424.218 C161.037,373.796 134.249,315.121 134.249,248.206 C134.249,212.816 142.487,179.473 158.985,148.198 C175.469,116.922 198.139,90.014 227.007,67.465 C255.857,44.916 290.123,27.349 329.810,14.736 C369.487,2.130 412.255,-4.175 458.127,-4.175 C491.619,-4.175 521.375,-1.993 547.403,2.370 C573.418,6.734 600.862,13.042 629.726,21.281 C658.580,29.531 682.023,35.713 700.069,39.828 C718.101,43.951 732.269,57.144 742.582,57.144 C770.917,57.144 790.242,35.961 800.555,2.504 L870.333,2.504 L870.333,317.302 L803.645,317.302 C782.005,266.876 754.042,222.751 719.780,184.927 C685.500,147.107 647.625,117.903 606.150,97.287 C564.661,76.680 522.016,66.374 478.225,66.374 C431.325,66.374 393.836,77.172 365.756,98.741 C337.661,120.321 323.630,149.052 323.630,184.927 C323.630,217.908 337.793,247.730 366.142,274.390 C382.108,288.460 413.293,307.245 459.670,330.758 C506.051,354.284 550.361,376.340 592.624,396.944 C614.707,407.719 636.721,418.934 658.668,430.566 L999.602,430.566 C1008.439,430.566 1015.602,437.730 1015.602,446.566 L1015.602,556.813 C1015.602,565.650 1008.439,572.813 999.602,572.813 ZM270.294,825.703 C307.395,866.433 348.361,897.594 393.195,919.167 C438.029,940.747 484.660,951.529 533.103,951.529 C568.143,951.529 599.196,945.236 626.248,932.619 C653.301,920.017 674.295,902.800 689.246,880.980 C704.188,859.160 711.661,834.433 711.661,806.793 C711.661,762.675 693.110,723.150 656.009,688.240 C639.510,671.759 615.680,661.588 584.509,644.371 L894.856,644.371 C909.279,679.045 916.502,709.332 916.502,748.605 C916.502,800.496 901.815,847.885 872.442,890.797 C843.068,933.710 802.353,967.293 750.310,991.535 C698.257,1015.773 641.322,1027.902 579.485,1027.902 C537.222,1027.902 499.215,1023.775 465.468,1015.537 C431.712,1007.287 393.450,996.386 350.682,982.804 C307.900,969.238 279.301,962.441 264.883,962.441 C244.265,962.441 246.469,968.383 231.013,980.260 C215.552,992.149 205.503,1007.535 200.866,1026.445 L151.394,1026.445 L151.394,683.876 L200.866,683.876 C223.535,737.697 233.188,784.972 270.294,825.703 Z\" class=\"cls-1\"/>\n</svg>\n",
		"../font/icons/subscript.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" preserveAspectRatio=\"xMidYMid\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill: #000;\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path d=\"M1224.354,1117.078 L1006.601,1117.078 L1006.601,1067.562 C1091.466,990.519 1138.701,951.568 1139.220,911.578 C1139.220,887.702 1124.350,874.518 1097.335,874.518 C1072.236,874.518 1052.062,887.167 1032.530,901.592 L1009.016,842.278 C1039.234,818.882 1075.104,808.372 1110.771,808.372 C1176.237,808.372 1218.537,846.614 1218.537,905.801 C1218.537,965.501 1168.603,1011.339 1122.925,1049.581 L1224.354,1049.581 L1224.354,1117.078 ZM486.761,678.568 L296.843,975.803 L46.215,975.803 L46.215,879.988 L100.910,879.988 C134.010,879.988 164.672,863.823 181.618,837.434 L377.259,532.875 L188.346,256.449 C171.116,231.230 141.182,215.947 109.001,215.947 L57.840,215.947 L57.840,120.132 L291.295,120.132 L486.761,404.237 L682.228,120.132 L915.687,120.132 L915.687,215.947 L864.527,215.947 C832.355,215.947 802.411,231.230 785.177,256.449 L596.263,532.875 L791.904,837.434 C808.860,863.823 839.522,879.988 872.622,879.988 L927.312,879.988 L927.312,975.803 L676.684,975.803 L486.761,678.568 Z\" class=\"cls-1\"/>\n</svg>\n",
		"../font/icons/summernote.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" preserveAspectRatio=\"xMidYMid\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill: #000;\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path d=\"M1122.033,577.898 L1033.442,577.898 C1036.450,557.776 1038.159,535.279 1038.159,511.748 C1038.159,488.736 1036.511,467.226 1033.634,447.104 L1122.033,447.104 C1157.345,447.104 1186.090,477.189 1186.090,512.501 C1186.090,547.813 1157.345,577.898 1122.033,577.898 ZM929.167,191.898 C901.164,155.489 868.523,122.848 832.113,94.843 L894.837,32.120 C907.751,19.206 924.985,12.093 943.363,12.093 C961.743,12.093 978.976,19.206 991.891,32.120 C1004.807,45.035 1011.919,62.269 1011.919,80.647 C1011.919,99.027 1004.807,116.261 991.891,129.176 L929.167,191.898 ZM390.139,620.385 C386.505,631.404 392.589,637.487 403.607,633.891 L541.794,588.779 L900.676,229.788 C958.318,309.034 992.407,406.516 992.407,512.006 C992.407,777.325 777.324,992.408 512.005,992.408 C246.687,992.408 31.604,777.325 31.604,512.006 C31.604,246.688 246.687,31.605 512.005,31.605 C617.495,31.605 714.974,65.693 794.222,123.335 L435.195,482.236 L390.139,620.385 ZM446.682,-9.540 L446.682,-98.033 C446.682,-133.345 476.766,-162.090 512.078,-162.090 C547.391,-162.090 577.475,-133.345 577.475,-98.033 L577.475,-9.511 C557.353,-12.464 535.275,-14.147 511.965,-14.147 C488.733,-14.147 466.804,-12.474 446.682,-9.540 ZM98.494,187.254 L34.795,124.042 C9.819,99.066 9.262,60.328 34.238,35.352 C59.215,10.391 98.716,10.361 123.721,35.352 L186.790,98.859 C153.982,124.741 124.340,154.417 98.494,187.254 ZM-98.033,577.898 C-133.345,577.898 -162.090,547.813 -162.090,512.501 C-162.090,477.189 -133.345,447.104 -98.033,447.104 L-9.623,447.104 C-12.500,467.226 -14.148,488.736 -14.148,511.748 C-14.148,535.279 -12.439,557.776 -9.430,577.898 L-98.033,577.898 ZM99.092,837.519 C124.835,870.105 154.326,899.562 186.941,925.272 L123.721,988.996 C111.226,1001.477 97.056,1008.066 80.657,1008.066 C64.246,1008.066 47.847,1002.477 35.352,989.996 C10.376,965.020 10.376,925.709 35.352,900.732 L99.092,837.519 ZM577.475,1033.524 L577.475,1122.033 C577.475,1157.345 547.391,1186.090 512.078,1186.090 C476.766,1186.090 446.682,1157.345 446.682,1122.033 L446.682,1033.552 C466.804,1036.486 488.733,1038.160 511.965,1038.160 C535.275,1038.160 557.353,1036.477 577.475,1033.524 ZM925.024,837.387 L988.957,900.732 C1013.933,925.709 1014.225,963.686 989.249,988.663 C976.754,1001.144 960.943,1007.399 944.545,1007.399 C928.133,1007.399 912.907,1001.144 900.413,988.663 L837.302,925.090 C869.869,899.389 899.316,869.949 925.024,837.387 Z\" class=\"cls-1\"/>\n</svg>\n",
		"../font/icons/superscript.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" preserveAspectRatio=\"xMidYMid\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill: #000;\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path d=\"M1224.352,265.601 L1122.923,265.601 C1168.606,227.355 1218.535,181.521 1218.535,121.817 C1218.535,62.634 1176.234,24.388 1110.769,24.388 C1075.107,24.388 1039.232,34.898 1009.019,58.298 L1032.528,117.612 C1052.060,103.187 1072.238,90.538 1097.337,90.538 C1124.347,90.538 1139.223,103.722 1139.223,127.594 C1138.704,167.588 1091.468,206.535 1006.603,283.581 L1006.603,333.098 L1224.352,333.098 L1224.352,265.601 ZM888.208,880.169 L888.208,976.165 L636.887,976.165 L446.450,678.379 L256.003,976.165 L4.691,976.165 L4.691,880.169 L59.527,880.169 C92.722,880.169 123.464,863.980 140.462,837.540 L336.646,532.418 L147.213,255.492 C129.927,230.222 99.907,214.911 67.646,214.911 L16.340,214.911 L16.340,118.919 L250.445,118.919 L446.450,403.552 L642.454,118.919 L876.550,118.919 L876.550,214.911 L825.253,214.911 C792.987,214.911 762.963,230.222 745.686,255.492 L556.253,532.422 L752.432,837.544 C769.426,863.980 800.172,880.173 833.363,880.173 L888.208,880.173 L888.208,880.169 Z\" class=\"cls-1\"/>\n</svg>\n",
		"../font/icons/table.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" preserveAspectRatio=\"xMidYMid\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill: #000;\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path d=\"M-73.241,975.691 L-73.241,49.254 L285.347,49.254 L358.022,49.254 L645.543,49.254 L718.150,49.254 L1076.738,49.254 L1076.738,975.691 L-73.241,975.691 ZM718.150,904.980 L1005.528,904.980 L1005.528,691.094 L718.150,691.094 L718.150,904.980 ZM1005.528,619.954 L1005.528,406.566 L718.150,406.566 L718.150,619.954 L1005.528,619.954 ZM358.022,904.980 L645.543,904.980 L645.543,691.094 L358.022,691.094 L358.022,904.980 ZM645.543,619.954 L645.543,406.566 L358.022,406.566 L358.022,619.954 L645.543,619.954 ZM-1.871,904.980 L285.347,904.980 L285.347,691.094 L-1.871,691.094 L-1.871,904.980 ZM285.347,619.954 L285.347,406.566 L-1.871,406.566 L-1.871,619.954 L285.347,619.954 ZM-1.871,120.996 L-1.871,335.391 L285.347,335.391 L285.347,120.996 L-1.871,120.996 ZM358.022,120.996 L358.022,335.391 L645.543,335.391 L645.543,120.996 L358.022,120.996 ZM718.150,120.996 L718.150,335.391 L1005.528,335.391 L1005.528,120.996 L718.150,120.996 Z\" class=\"cls-1\"/>\n</svg>\n",
		"../font/icons/text-height.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" preserveAspectRatio=\"xMidYMid\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill: #000;\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path d=\"M1073.727,843.931 L1211.024,843.931 L1039.529,975.262 L868.030,843.931 L1005.602,843.931 L1005.602,251.428 L876.962,251.428 L1039.529,120.159 L1202.092,251.428 L1073.727,251.428 L1073.727,843.931 ZM649.994,233.729 C624.218,210.392 565.126,198.716 508.696,198.716 L430.715,198.716 L430.715,797.755 C430.715,837.588 437.714,865.323 451.712,880.954 C465.705,896.596 495.137,904.404 540.026,904.404 L563.354,904.404 L563.354,975.720 L76.224,975.720 L76.224,904.404 L97.552,904.404 C142.875,904.404 178.706,896.374 192.265,880.311 C205.816,864.251 212.595,836.734 212.595,797.755 L212.595,198.716 L130.211,198.716 C84.888,198.716 29.423,203.434 8.095,212.849 C-13.237,222.275 -31.128,241.017 -45.565,269.065 C-60.005,297.124 -68.785,330.421 -71.891,368.971 L-145.075,368.971 L-145.075,120.977 L789.565,120.977 L789.565,368.971 L709.981,368.971 C695.755,302.152 675.761,257.081 649.994,233.729 Z\" class=\"cls-1\"/>\n</svg>\n",
		"../font/icons/trash.svg": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generator: Adobe Illustrator 16.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n	 width=\"1024px\" height=\"1024px\" viewBox=\"0 0 1024 1024\" enable-background=\"new 0 0 1024 1024\" xml:space=\"preserve\">\n<g>\n	<g>\n		<path fill=\"#040507\" d=\"M684.868,95.723c-38.258,0-69.273-30.712-69.273-68.606H389.834c0,37.891-31.018,68.606-69.276,68.606\n			H15.731v69.894h978.333V95.723H684.868z M224.755,996.884h560.281L924.92,234.799H84.871L224.755,996.884z M688.173,355.88\n			c0-22.491,18.415-40.721,41.121-40.721c22.71,0,41.12,18.23,41.12,40.721l-60.545,515.828c0,22.491-18.415,40.719-41.118,40.719\n			c-22.707,0-41.116-18.229-41.116-40.719L688.173,355.88z M464.44,355.88c0-22.491,18.413-40.721,41.123-40.721\n			c22.708,0,41.115,18.23,41.115,40.721v515.828c0,22.491-18.407,40.719-41.115,40.719c-22.712,0-41.123-18.229-41.123-40.719\n			V355.88z M269.712,315.159c22.711,0,41.118,18.23,41.118,40.721l70.229,515.828c0,22.491-18.405,40.719-41.113,40.719\n			c-22.712,0-41.123-18.229-41.123-40.719L228.593,355.88C228.594,333.39,247.004,315.159,269.712,315.159z\"/>\n	</g>\n</g>\n</svg>\n",
		"../font/icons/underline.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" preserveAspectRatio=\"xMidYMid\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill: #000;\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path d=\"M908.526,146.582 C888.706,156.816 875.010,171.009 867.419,189.175 C859.828,207.341 856.035,232.713 856.035,265.284 L856.035,549.047 C856.035,610.022 852.133,659.822 844.334,698.446 C836.531,737.077 818.089,774.240 788.998,809.946 C759.903,845.651 719.429,874.367 667.570,896.077 C615.711,917.783 558.158,928.648 494.914,928.648 C428.718,928.648 369.376,917.893 316.885,896.388 C264.394,874.886 224.231,847.742 196.405,814.955 C168.579,782.175 149.702,746.473 139.800,707.842 C129.892,669.218 124.938,623.384 124.938,570.343 L124.938,235.218 C124.938,195.125 117.984,167.780 104.071,153.158 C90.153,138.544 59.799,131.235 12.997,131.235 L12.997,61.702 L465.824,61.702 L465.824,131.235 L451.278,131.235 C408.686,131.235 381.077,138.965 368.428,154.410 C355.779,169.867 349.453,196.799 349.453,235.218 L349.453,570.343 C349.453,631.319 354.515,679.338 364.635,714.418 C374.750,749.498 396.886,779.359 431.039,803.995 C465.192,828.639 506.081,840.953 553.732,840.953 C605.591,840.953 649.958,827.796 686.861,801.487 C723.745,775.177 747.670,743.134 758.639,705.333 C769.599,667.544 775.085,614.819 775.085,547.168 L775.085,261.527 C775.085,174.671 732.709,131.235 647.962,131.235 L647.962,61.702 L965.447,61.702 L965.447,131.235 C947.312,131.235 928.341,136.351 908.526,146.582 ZM932.995,1046.691 L70.468,1046.691 L70.468,975.619 L932.995,975.619 L932.995,1046.691 Z\" class=\"cls-1\"/>\n</svg>\n",
		"../font/icons/undo.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">\n  <defs>\n    <style>\n      .cls-1 {\n        fill-rule: evenodd;\n      }\n    </style>\n  </defs>\n  <path id=\"Shape_29_copy_2\" data-name=\"Shape 29 copy 2\" class=\"cls-1\" d=\"M-84.808,193.372V728.531H480.079L325.064,580.294s-21.019-241.2,341.56-241.2S1176.34,648.131,1176.34,648.131s-147.14-482.4-546.5-482.4c-364.362,0-567.515,165.824-567.515,165.824Z\"/>\n</svg>\n",
		"../font/icons/unorderedlist.svg": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generator: Adobe Illustrator 16.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n	 width=\"1024px\" height=\"1024px\" viewBox=\"0 0 1024 1024\" enable-background=\"new 0 0 1024 1024\" xml:space=\"preserve\">\n<path d=\"M1032.671,90.351H270.806v170.108h761.865V90.351L1032.671,90.351z M271.531,428.395v168.558h761.97V428.395H271.531z\n	 M270.806,933.649h761.865V765.3H270.806V933.649z M160.712,90.351H-9.5v170.108h170.212V90.351L160.712,90.351z M-8.982,596.951\n	h170.314V428.395H-8.982V596.951z M-9.397,933.649h170.212V765.3H-9.397V933.649L-9.397,933.649z\"/>\n</svg>\n",
		"../font/icons/video.svg": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generator: Adobe Illustrator 16.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" id=\"Layer_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n	 width=\"1024px\" height=\"1024px\" viewBox=\"0 0 1024 1024\" enable-background=\"new 0 0 1024 1024\" xml:space=\"preserve\">\n<path d=\"M-70.443,728.622l284.268-120.036V416.415L-70.443,296.266V728.622z M962.801,200.673H329.249\n	c-39.146,0-71.374,31.489-71.374,69.789v484.301c0,38.076,32.118,69.564,71.374,69.564h633.552\n	c39.256,0,71.263-31.488,71.263-69.564V270.351C1034.064,232.162,1001.946,200.673,962.801,200.673z\"/>\n</svg>\n"
	});
	function normalizeSvg(raw) {
		return raw.replace(/<\?xml[^>]*>\s*/g, "").replace(/<!DOCTYPE[^>]*>\s*/g, "").replace(/<!--[\s\S]*?-->/g, "").replace(/<metadata>[\s\S]*?<\/metadata>\s*/gi, "").replace(/<defs>[\s\S]*?<\/defs>\s*/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>\s*/gi, "").replace(/\sclass="cls-\d+"/g, " fill=\"currentColor\"").replace(/\sclass="st0"/g, " fill=\"currentColor\"").replace(/\sfill="#[0-9a-fA-F]{3,8}"/g, " fill=\"currentColor\"").replace(/(style="[^"]*fill:\s*)#[0-9a-fA-F]+/gi, "$1currentColor").replace(/\swidth="[^"]*"/, "").replace(/\sheight="[^"]*"/, "").trim();
	}
	var ICONS = {};
	for (const [path, raw] of Object.entries(rawIcons)) {
		const name = path.replace(/^.*\//, "").replace(/\.svg$/, "");
		ICONS[name] = normalizeSvg(raw);
	}
	function getIconSvg(name) {
		return ICONS[name] || null;
	}
	var ICON_PREFIX = "note-icon-";
	//#endregion
	//#region src/styles/bs5/summernote-bs5.js
	var editor = renderer_default.create("<div class=\"note-editor note-frame card\"></div>");
	var toolbar = renderer_default.create("<div class=\"note-toolbar card-header\" role=\"toolbar\"></div>");
	var editingArea = renderer_default.create("<div class=\"note-editing-area\"></div>");
	var codable = renderer_default.create("<textarea class=\"note-codable\" aria-multiline=\"true\"></textarea>");
	var editable = renderer_default.create("<div class=\"note-editable card-block\" contentEditable=\"true\" role=\"textbox\" aria-multiline=\"true\"/>");
	var statusbar = renderer_default.create([
		"<output class=\"note-status-output\" role=\"status\" aria-live=\"polite\"></output>",
		"<div class=\"note-statusbar card-footer border-top-0 shadow-sm\" role=\"status\">",
		"<div class=\"note-resizebar\" aria-label=\"Resize\">",
		"<div class=\"note-icon-bar\"></div>",
		"<div class=\"note-icon-bar\"></div>",
		"<div class=\"note-icon-bar\"></div>",
		"</div>",
		"</div>"
	].join(""));
	var airEditor = renderer_default.create("<div class=\"note-editor note-airframe\"></div>");
	var airEditable = renderer_default.create(["<div class=\"note-editable\" contentEditable=\"true\" role=\"textbox\" aria-multiline=\"true\"></div>", "<output class=\"note-status-output\" role=\"status\" aria-live=\"polite\"></output>"].join(""));
	var buttonGroup = renderer_default.create("<div class=\"note-btn-group btn-group\" role=\"group\"></div>");
	var dropdown = renderer_default.create("<div class=\"note-dropdown-menu dropdown-menu\" role=\"list\">", function($node, options) {
		if (options && options.items !== void 0) {
			const markup = Array.isArray(options.items) ? options.items.map(function(item) {
				const value = typeof item === "string" ? item : item.value || "";
				const content = options.template ? options.template(item) : item;
				const option = typeof item === "object" ? item.option : void 0;
				return "<a class=\"dropdown-item\" href=\"#\" " + ("data-value=\"" + value + "\"" + (option !== void 0 ? " data-option=\"" + option + "\"" : "")) + " role=\"listitem\" aria-label=\"" + value + "\">" + content + "</a>";
			}).join("") : options.items;
			$node.html(markup);
		}
		if (options && options.title) $node.attr({ "aria-label": options.title });
		if (options && options.codeviewKeepButton) $node.addClass("note-codeview-keep");
	});
	var dropdownButtonContents = function(contents) {
		return contents;
	};
	var dropdownCheck = renderer_default.create("<div class=\"note-dropdown-menu dropdown-menu note-check\" role=\"list\">", function($node, options) {
		if (options && options.items !== void 0) {
			const markup = Array.isArray(options.items) ? options.items.map(function(item) {
				const value = typeof item === "string" ? item : item.value || "";
				const content = options.template ? options.template(item) : item;
				return "<a class=\"dropdown-item\" href=\"#\" data-value=\"" + value + "\" role=\"listitem\" aria-label=\"" + item + "\">" + icon(options.checkClassName) + " " + content + "</a>";
			}).join("") : options.items;
			$node.html(markup);
		}
		if (options && options.title) $node.attr({ "aria-label": options.title });
		if (options && options.codeviewKeepButton) $node.addClass("note-codeview-keep");
	});
	var dialog = renderer_default.create("<div class=\"modal note-modal\" aria-hidden=\"false\" tabindex=\"-1\" role=\"dialog\"></div>", function($node, options) {
		if (options.fade) $node.addClass("fade");
		$node.attr({ "aria-label": options.title });
		$node.html([
			"<div class=\"modal-dialog\">",
			"<div class=\"modal-content\">",
			options.title ? "<div class=\"modal-header\"><h4 class=\"modal-title\">" + options.title + "</h4><button type=\"button\" class=\"btn-close\" data-bs-dismiss=\"modal\" aria-label=\"Close\" aria-hidden=\"true\"></button></div>" : "",
			"<div class=\"modal-body\">" + options.body + "</div>",
			options.footer ? "<div class=\"modal-footer\">" + options.footer + "</div>" : "",
			"</div>",
			"</div>"
		].join(""));
	});
	var popover = renderer_default.create([
		"<div class=\"note-popover popover bs-popover-auto show\">",
		"<div class=\"popover-body note-popover-content note-children-container\"></div>",
		"</div>"
	].join(""), function($node, options) {
		const direction = typeof options.direction !== "undefined" ? options.direction : "bottom";
		$node.attr("data-popper-placement", direction);
	});
	var checkbox = renderer_default.create("<div class=\"form-check\"></div>", function($node, options) {
		$node.html([
			"<label class=\"form-check-label\"" + (options.id ? " for=\"note-" + options.id + "\"" : "") + ">",
			"<input type=\"checkbox\" class=\"form-check-input\"" + (options.id ? " id=\"note-" + options.id + "\"" : ""),
			options.checked ? " checked" : "",
			" aria-label=\"" + (options.text ? options.text : "") + "\"",
			" aria-checked=\"" + (options.checked ? "true" : "false") + "\"/>",
			" " + (options.text ? options.text : "") + "</label>"
		].join(""));
	});
	var icon = function(iconClassName, tagName) {
		if (!iconClassName) return "";
		if (iconClassName.charAt(0) === "<") return iconClassName;
		const tokens = iconClassName.split(/\s+/).filter(Boolean);
		const iconToken = tokens.find((token) => token.startsWith(ICON_PREFIX));
		if (!iconToken) {
			tagName = tagName || "i";
			return "<" + tagName + " class=\"" + iconClassName + "\"></" + tagName + ">";
		}
		const name = iconToken.slice(ICON_PREFIX.length);
		const extra = tokens.filter((token) => token !== iconToken).join(" ").trim();
		const cls = "note-icon " + ICON_PREFIX + name + (extra ? " " + extra : "");
		const svg = getIconSvg(name) || ICONS[name] || "";
		return "<i class=\"" + cls + "\" aria-hidden=\"true\">" + svg + "</i>";
	};
	var initializeTooltip = function($node, options, editorOptions) {
		if (!options || !options.tooltip) return;
		const tooltipContainer = options.container || editorOptions.container || void 0;
		$node.attr({
			title: options.tooltip,
			"aria-label": options.tooltip
		}).tooltip({
			...tooltipContainer ? { container: tooltipContainer } : {},
			trigger: "hover",
			placement: "bottom"
		}).on("click", (e) => {
			$$(e.currentTarget).tooltip("hide");
		});
	};
	var ui = function(editorOptions) {
		return {
			editor,
			toolbar,
			editingArea,
			codable,
			editable,
			statusbar,
			airEditor,
			airEditable,
			buttonGroup,
			dropdown,
			dropdownButtonContents,
			dropdownCheck,
			dialog,
			popover,
			icon,
			checkbox,
			options: editorOptions,
			palette: function($node, options) {
				return renderer_default.create("<div class=\"note-color-palette\"></div>", function($node, options) {
					const contents = [];
					for (let row = 0, rowSize = options.colors.length; row < rowSize; row++) {
						const eventName = options.eventName;
						const colors = options.colors[row];
						const colorsName = options.colorsName[row];
						const buttons = [];
						for (let col = 0, colSize = colors.length; col < colSize; col++) {
							const color = colors[col];
							const colorName = colorsName[col];
							buttons.push([
								"<button type=\"button\" class=\"note-color-btn\"",
								"style=\"background-color:",
								color,
								"\" ",
								"data-event=\"",
								eventName,
								"\" ",
								"data-value=\"",
								color,
								"\" ",
								"title=\"",
								colorName,
								"\" ",
								"aria-label=\"",
								colorName,
								"\" ",
								"data-toggle=\"button\" tabindex=\"-1\"></button>"
							].join(""));
						}
						contents.push("<div class=\"note-color-row\">" + buttons.join("") + "</div>");
					}
					$node.html(contents.join(""));
					if (options.tooltip) {
						const tooltipContainer = options.container || editorOptions.container || void 0;
						var tooltipOptions = {
							...tooltipContainer ? { container: tooltipContainer } : {},
							trigger: "hover",
							placement: "bottom"
						};
						$node.tooltip({
							selector: ".note-color-btn",
							...tooltipOptions
						});
					}
				})($node, options);
			},
			button: function($node, options) {
				return renderer_default.create("<button type=\"button\" class=\"note-btn btn btn-outline-secondary btn-sm\" tabindex=\"-1\">", function($node, options) {
					if (options && options.data && options.data.toggle === "dropdown") {
						$node.removeAttr("data-toggle");
						$node.attr({
							"data-note-toggle": "dropdown",
							"aria-expanded": "false",
							"aria-haspopup": "true"
						});
					}
					initializeTooltip($node, options, editorOptions);
					if (options && options.codeviewButton) $node.addClass("note-codeview-keep");
				})($node, options);
			},
			toggleBtn: function($btn, isEnable) {
				$btn.toggleClass("disabled", !isEnable);
				$btn.prop("disabled", !isEnable);
				$btn.attr("disabled", !isEnable);
			},
			toggleBtnActive: function($btn, isActive) {
				$btn.toggleClass("active", isActive);
			},
			onDialogShown: function($dialog, handler) {
				$dialog.one("shown.bs.modal", handler);
			},
			onDialogHidden: function($dialog, handler) {
				$dialog.one("hidden.bs.modal", handler);
			},
			showDialog: function($dialog) {
				$dialog.modal("show");
			},
			hideDialog: function($dialog) {
				$dialog.modal("hide");
			},
			createLayout: function($note) {
				const $editor = (editorOptions.airMode ? airEditor([editingArea([codable(), airEditable()])]) : editorOptions.toolbarPosition === "bottom" ? editor([
					editingArea([codable(), editable()]),
					toolbar(),
					statusbar()
				]) : editor([
					toolbar(),
					editingArea([codable(), editable()]),
					statusbar()
				])).render();
				if (!editorOptions.airMode) $editor.addClass(`note-editor-toolbar-${editorOptions.toolbarPosition}`);
				$editor.insertAfter($note);
				return {
					note: $note,
					editor: $editor,
					toolbar: $editor.find(".note-toolbar"),
					editingArea: $editor.find(".note-editing-area"),
					editable: $editor.find(".note-editable"),
					codable: $editor.find(".note-codable"),
					statusbar: $editor.find(".note-statusbar")
				};
			},
			removeLayout: function($note, layoutInfo) {
				$note.html(layoutInfo.editable.html());
				layoutInfo.editor.remove();
				$note.show();
			}
		};
	};
	$$.summernote = Object.assign($$.summernote, {
		ui_template: ui,
		interface: "bs5"
	});
	$$.summernote.options.styleTags = [
		"p",
		{
			title: "Blockquote",
			tag: "blockquote",
			className: "blockquote",
			value: "blockquote"
		},
		"pre",
		"h1",
		"h2",
		"h3",
		"h4",
		"h5",
		"h6"
	];
	//#endregion
	return $$;
})();

//# sourceMappingURL=summernote-next.js.map