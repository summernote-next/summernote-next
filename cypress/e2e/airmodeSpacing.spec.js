describe('summernote classic air popover spacing', () => {
  beforeEach(() => {
    cy.visit('/summernote-next-classic/airmode.html');
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
    cy.get('.note-air-popover', { timeout: 5000 }).should('exist');
    cy.get('.note-editable').first().then(($editable) => {
      $editable.trigger('mousedown', { clientX: 100, clientY: 100 });
      $editable.trigger('mouseup', { clientX: 100, clientY: 100 });
    });
  });

  it('pads the air popover body evenly on all sides', () => {
    cy.get('.note-air-popover .note-popover-content')
      .should('have.css', 'padding', '6px');
  });

  it('spaces the air popover button groups with the toolbar gap', () => {
    cy.get('.note-air-popover .note-popover-content')
      .should('have.css', 'gap', '8px');
  });

  it('keeps the air popover body in a single flex row', () => {
    cy.get('.note-air-popover .note-popover-content').then(($content) => {
      const styles = window.getComputedStyle($content[0]);
      expect(styles.display).to.equal('flex');
      expect(styles.flexWrap).to.equal('wrap');
    });
  });

  it('paints the air popover button borders like the toolbar', () => {
    cy.get('.note-air-popover .note-btn-bold')
      .should('have.css', 'border-top-color', 'rgb(222, 226, 230)');
  });

  it('opens the color dropdown when its toggle is clicked', () => {
    cy.get('.note-air-popover [data-note-toggle="dropdown"]').first().click({ force: true });
    cy.get('.note-air-popover .note-color .note-dropdown-menu').first()
      .should('have.class', 'show');
  });

  it('keeps the air popover body bounded by the viewport (max-width)', () => {
    cy.viewport(1745, 900);
    cy.get('.note-air-popover .note-popover-content').should(($body) => {
      const styles = $body[0].ownerDocument.defaultView.getComputedStyle($body[0]);
      expect(styles.maxWidth).to.equal('1725px');
    });
  });
});

describe('summernote air popover viewport clamping', () => {
  const cases = [
    { name: 'classic', url: '/summernote-next-classic/airmode-all-features.html' },
    { name: 'bs5', url: '/summernote-next/airmode-all-features.html' },
  ];

  cases.forEach(({ name, url }) => {
    it(`keeps the ${name} air popover width bounded by the viewport`, () => {
      cy.visit(url);
      cy.viewport(1745, 900);
      cy.get('.note-editor', { timeout: 5000 }).should('exist');
      cy.get('.note-air-popover', { timeout: 5000 }).should('exist');
      cy.get('.note-air-popover .note-popover-content').should(($body) => {
        const styles = $body[0].ownerDocument.defaultView.getComputedStyle($body[0]);
        expect(styles.maxWidth).to.equal('1725px');
      });
    });
  });
});
