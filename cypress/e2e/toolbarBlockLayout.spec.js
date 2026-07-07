const FULL = '/summernote-next/full.html';

function ensureIconsPainted() {
  // Wait until the lazy svg loader has painted the toolbar glyphs so layout
  // measurements observe the rendered buttons, not the placeholder wrappers.
  cy.get('.note-toolbar .note-icon-bold svg', { timeout: 5000 }).should('exist');
}

describe('toolbar block layout', () => {
  beforeEach(() => {
    cy.visit(FULL);
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
    cy.window().then((win) => win.summernote.invoke('#all-features-editor', 'empty'));
    ensureIconsPainted();
  });

  it('lays out icon buttons at the natural btn-sm height with centred icons', () => {
    cy.get('.note-btn-bold').within(($btn) => {
      const width = $btn[0].getBoundingClientRect().width;
      const height = $btn[0].getBoundingClientRect().height;
      // Natural Bootstrap btn-sm dimensions. The exact pixel counts can shift
      // a hair depending on the test font stack but both axes must be
      // roughly 32px.
      expect(width).to.be.within(28, 36);
      expect(height).to.be.within(28, 36);
    });

    cy.get('.note-btn-bold').within(($btn) => {
      const iconRect = $btn.find('.note-icon')[0].getBoundingClientRect();
      const svgRect = $btn.find('.note-icon > svg')[0].getBoundingClientRect();
      // Icon wrapper is 1em × 1em (a square) and the SVG fills it.
      expect(Math.abs(iconRect.width - iconRect.height)).to.be.lessThan(0.5);
      expect(Math.abs(svgRect.width - iconRect.width)).to.be.lessThan(1);
      expect(Math.abs(svgRect.height - iconRect.height)).to.be.lessThan(1);
    });
    cy.screenshot('toolbar-block-bold');
  });

  it('overrides the source/code icon size via the .note-icon-lg utility class', () => {
    cy.get('.btn-codeview').within(($btn) => {
      const iconRect = $btn.find('.note-icon-code')[0].getBoundingClientRect();
      const svgRect = $btn.find('.note-icon-code > svg')[0].getBoundingClientRect();
      const pct = (svgRect.width / iconRect.width) * 100;
      // The .note-icon-lg class sizes the SVG at 1.25em while the wrapper
      // stays at 1em, so the rendered glyph is ~25% wider than the default.
      expect(pct).to.be.greaterThan(110);
    });
    cy.screenshot('toolbar-block-codeview');
  });

  it('keeps the Bootstrap caret visible on dropdown toggles next to the icon', () => {
    cy.get('button[aria-label="Paragraph"]').should(($btn) => {
      const afterDisplay = window.getComputedStyle($btn[0], '::after').display;
      expect(afterDisplay).not.to.equal('none');
    });
    cy.screenshot('toolbar-block-paragraph');
  });

  it('renders the dropdown menu items as square blocks too', () => {
    cy.get('button[aria-label="Paragraph"]').first().click();
    cy.get('.note-para .note-dropdown-menu.show .note-btn', { timeout: 5000 }).should(($items) => {
      expect($items.length).to.be.greaterThan(0);
      $items.each((_, item) => {
        const rect = item.getBoundingClientRect();
        // The alignment and outdent items come in two columns but every
        // individual button keeps a square footprint.
        expect(rect.width).to.be.greaterThan(0);
        expect(rect.height).to.be.greaterThan(0);
        expect(Math.abs(rect.width - rect.height)).to.be.lessThan(2);
      });
    });
    cy.screenshot('toolbar-block-paragraph-dropdown');
  });

  it('hides the Bootstrap caret on icon-only buttons so it does not overflow', () => {
    cy.get('.note-btn-bold').then(($btn) => {
      const afterDisplay = window.getComputedStyle($btn[0], '::after').display;
      expect(afterDisplay).to.equal('none');
    });
  });

  it('aligns superscript and subscript glyphs so the X characters share a baseline', () => {
    // The demo toolbar exposes both glyphs in the same row.
    cy.get('.note-btn-superscript').should('exist');
    cy.get('.note-btn-subscript').should('exist');
    cy.get('.note-btn-superscript').then(($sup) => {
      cy.get('.note-btn-subscript').then(($sub) => {
        const supRect = $sup[0].getBoundingClientRect();
        const subRect = $sub[0].getBoundingClientRect();
        // Both buttons share the same row.
        expect(Math.abs(supRect.top - subRect.top)).to.be.lessThan(1);
        expect(Math.abs(supRect.height - subRect.height)).to.be.lessThan(1);
        // The CSS shifts each glyph vertically so the underlying "X" shapes
        // overlap on a common baseline.
        const supTransform = window.getComputedStyle($sup[0].querySelector('svg')).transform;
        const subTransform = window.getComputedStyle($sub[0].querySelector('svg')).transform;
        expect(supTransform).not.to.equal('none');
        expect(subTransform).not.to.equal('none');
        expect(supTransform).not.to.equal(subTransform);
      });
    });
    cy.screenshot('toolbar-block-super-sub');
  });
});