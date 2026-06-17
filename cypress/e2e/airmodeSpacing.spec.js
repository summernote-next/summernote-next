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
      expect(styles.flexWrap).to.equal('nowrap');
    });
  });
});
