import { describe, it, expect, vi } from 'vitest';
import func from '@/js/core/func';

describe('base:core.func', () => {
  describe('eq', () => {
    it('should return true if two values are same', () => {
      expect(func.eq(1)(1)).to.be.ok;
    });
  });

  describe('eq2', () => {
    it('should return true if two values are same', () => {
      expect(func.eq2(1, 1)).to.be.ok;
    });

    it('should return false if two values are not same', () => {
      expect(func.eq2(1, '1')).to.be.not.ok;
    });
  });

  describe('peq2', () => {
    it('should return true when two properties are same', () => {
      expect(func.peq2('prop')({ prop: 'hello' }, { prop: 'hello' })).to.be.ok;
    });

    it('should return false when two properties are not same', () => {
      expect(func.peq2('prop')({ prop: 'hello' }, { prop: 'world' })).to.be.not.ok;
    });
  });

  describe('ok', () => {
    it('should return true', () => {
      expect(func.ok()).to.be.ok;
    });
  });

  describe('fail', () => {
    it('should return false', () => {
      expect(func.fail()).to.be.not.ok;
    });
  });

  describe('not', () => {
    it('should return opposite function', () => {
      expect(func.not(func.ok)()).to.be.not.ok;
      expect(func.not(func.fail)()).to.be.ok;
    });
  });

  describe('and', () => {
    it('should return composite function', () => {
      expect(func.and(func.ok, func.ok)()).to.be.ok;
      expect(func.and(func.fail, func.ok)()).to.be.not.ok;
      expect(func.and(func.fail, func.fail)()).to.be.not.ok;
    });
  });

  describe('invoke', () => {
    it('should return function which invoke the method', () => {
      expect(func.invoke(func, 'ok')()).to.be.ok;
      expect(func.invoke(func, 'fail')()).to.be.not.ok;
    });
  });

  describe('uniqueId', () => {
    it('should return uniqueId with the prefix as a parameter', () => {
      func.resetUniqueId();
      expect(func.uniqueId('note-')).to.be.equal('note-1');
      expect(func.uniqueId('note-')).to.be.equal('note-2');
      expect(func.uniqueId('note-')).to.be.equal('note-3');
    });

    it('should return uniqueId without a prefix', () => {
      func.resetUniqueId();
      expect(func.uniqueId()).to.be.equal('1');
    });
  });

  describe('invertObject', () => {
    it('should return inverted object between keys and values', () => {
      expect(func.invertObject({ keyA: 'valueA', keyB: 'valueB' })).to.deep.equal({ valueA: 'keyA', valueB: 'keyB' });
    });

    it('should ignore inherited object keys', () => {
      const source = Object.create({ inherited: 'skip' });
      source.own = 'keep';

      expect(func.invertObject(source)).to.deep.equal({ keep: 'own' });
    });
  });

  describe('namespaceToCamel', () => {
    it('should return camelcase text', () => {
      expect(func.namespaceToCamel('upload.image')).to.be.equal('UploadImage');
    });

    it('should return prefixed camelcase text', () => {
      expect(func.namespaceToCamel('upload.image', 'summernote')).to.be.equal('summernoteUploadImage');
    });
  });

  describe('debounce', () => {
    it('shouldnt execute immediately', () => {
      var hasHappened = false;
      var fn = func.debounce(() => {
        hasHappened = true;
      }, 100);

      expect(hasHappened).to.be.false;
      fn();
      expect(hasHappened).to.be.false;
    });

    it('should execute after delay', async() => {
      var hasHappened = false;
      var fn = func.debounce(() => {
        hasHappened = true;
      }, 100);

      fn();

      await new Promise((resolve) => setTimeout(resolve, 101));
      expect(hasHappened).to.be.true;
    });

    it('should only happen once', async() => {
      var count = 0;
      var fn = func.debounce(() => {
        count += 1;
      }, 100);

      fn();
      fn();
      fn();

      await new Promise((resolve) => setTimeout(resolve, 101));
      expect(count).to.be.equal(1);
    });

    it('should execute immediately when requested', async() => {
      const spy = vi.fn();
      const fn = func.debounce(spy, 50, true);

      fn('first');
      fn('second');

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('first');

      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('isValidUrl', () => {
    it('should return true with valid URLs', () => {
      expect(func.isValidUrl('https://www.summernote.org')).to.be.ok;
      expect(func.isValidUrl('http://summernote.org')).to.be.ok;
      expect(func.isValidUrl('summernote.org')).to.be.ok;
    });

    it('should return false with invalid URLs', () => {
      expect(func.isValidUrl('summernote')).to.be.not.ok;
    });
  });

  describe('sanitizeUrl', () => {
    it('should keep safe URLs unchanged', () => {
      expect(func.sanitizeUrl('https://www.summernote.org')).to.be.equal('https://www.summernote.org');
      expect(func.sanitizeUrl('http://summernote.org/path?a=1#frag')).to.be.equal('http://summernote.org/path?a=1#frag');
      expect(func.sanitizeUrl('mailto:test@example.com')).to.be.equal('mailto:test@example.com');
      expect(func.sanitizeUrl('tel:+123456789')).to.be.equal('tel:+123456789');
      expect(func.sanitizeUrl('/relative/path')).to.be.equal('/relative/path');
      expect(func.sanitizeUrl('#anchor')).to.be.equal('#anchor');
    });

    it('should neutralize javascript: URLs', () => {
      expect(func.sanitizeUrl('javascript:alert(1)')).to.be.equal('#');
      expect(func.sanitizeUrl('JaVaScRiPt:alert(1)')).to.be.equal('#');
      expect(func.sanitizeUrl('  javascript:alert(1)')).to.be.equal('#');
    });

    it('should neutralize obfuscated javascript: URLs with control characters', () => {
      expect(func.sanitizeUrl('java\tscript:alert(1)')).to.be.equal('#');
      expect(func.sanitizeUrl('java\nscript:alert(1)')).to.be.equal('#');
      expect(func.sanitizeUrl('\u0000javascript:alert(1)')).to.be.equal('#');
      expect(func.sanitizeUrl('java\u0000script:alert(1)')).to.be.equal('#');
    });

    it('should neutralize other dangerous schemes', () => {
      expect(func.sanitizeUrl('vbscript:msgbox(1)')).to.be.equal('#');
      expect(func.sanitizeUrl('data:text/html,<script>alert(1)</script>')).to.be.equal('#');
      expect(func.sanitizeUrl('blob:https://evil/abc')).to.be.equal('#');
      expect(func.sanitizeUrl('file:///etc/passwd')).to.be.equal('#');
    });

    it('should pass through empty or non-string values', () => {
      expect(func.sanitizeUrl('')).to.be.equal('');
      expect(func.sanitizeUrl(null)).to.be.equal(null);
      expect(func.sanitizeUrl(undefined)).to.be.equal(undefined);
    });
  });

  describe('rect2bnd', () => {
    it('should return zero rect for null input', () => {
      expect(func.rect2bnd(null)).to.deep.equal({ top: 0, left: 0, width: 0, height: 0 });
    });

    it('should translate rect to bounds with scroll offsets', () => {
      const rect = { top: 10, left: 20, right: 30, bottom: 50 };
      const bnd = func.rect2bnd(rect);
      expect(bnd.top).to.be.a('number');
      expect(bnd.left).to.be.a('number');
      expect(bnd.width).to.be.equal(10);
      expect(bnd.height).to.be.equal(40);
    });
  });
});
