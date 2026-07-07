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

  it('lays out icon-only buttons as square blocks with centred glyphs', () => {
    cy.get('.note-btn-bold').then(($btn) => {
      const width = $btn[0].getBoundingClientRect().width;
      const height = $btn[0].getBoundingClientRect().height;
      expect(Math.abs(width - height)).to.be.lessThan(0.5);
    });

    cy.get('.note-btn-bold').within(($btn) => {
      const iconRect = $btn.find('.note-icon')[0].getBoundingClientRect();
      const svgRect = $btn.find('.note-icon > svg')[0].getBoundingClientRect();
      const pct = (svgRect.width / iconRect.width) * 100;
      expect(Math.abs(pct - 70)).to.be.lessThan(2);
    });
    cy.screenshot('toolbar-block-bold');
  });

  it('overrides the source/code icon to 80% of the wrapper', () => {
    cy.get('.btn-codeview').within(($btn) => {
      const iconRect = $btn.find('.note-icon-code')[0].getBoundingClientRect();
      const svgRect = $btn.find('.note-icon-code > svg')[0].getBoundingClientRect();
      const pct = (svgRect.width / iconRect.width) * 100;
      expect(Math.abs(pct - 80)).to.be.lessThan(2);
    });
    cy.screenshot('toolbar-block-codeview');
  });

  it('renders dropdown toggles that carry an icon as square blocks', () => {
    cy.get('button[aria-label="Paragraph"]').then(($btn) => {
      const rect = $btn[0].getBoundingClientRect();
      expect(Math.abs(rect.width - rect.height)).to.be.lessThan(0.5);
    });
    cy.get('button[aria-label="Paragraph"]').click();
    cy.get('.note-para .note-dropdown-menu.show .note-btn').should(($items) => {
      $items.each((_, item) => {
        const rect = item.getBoundingClientRect();
        expect(Math.abs(rect.width - rect.height)).to.be.lessThan(0.5);
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
});