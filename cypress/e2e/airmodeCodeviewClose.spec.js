describe('summernote air mode codeview close button', () => {
  const cases = [
    { name: 'classic', url: '/summernote-next-classic/airmode.html' },
    { name: 'bs5', url: '/summernote-next/airmode.html' },
  ];

  cases.forEach(({ name, url }) => {
    it(`shows the floating close button in ${name} air mode codeview`, () => {
      cy.visit(url);
      cy.get('.note-editor', { timeout: 5000 }).should('exist');
      cy.get('.note-air-popover', { timeout: 5000 }).should('exist');
      cy.get('.note-editable').first().then(($editable) => {
        const rect = $editable[0].getBoundingClientRect();
        const selectX = rect.left + 40;
        const selectY = rect.top + 20;
        $editable.trigger('mousedown', { clientX: selectX, clientY: selectY });
        cy.wrap($editable).trigger('mouseup', { clientX: selectX, clientY: selectY });
      });
      cy.get('.note-air-popover .btn-codeview').click({ force: true });

      cy.get('.note-editor').should('have.class', 'codeview');
      cy.get('.note-air-codeview-close')
        .should('exist')
        .and('be.visible')
        .and('have.attr', 'aria-label');
      cy.screenshot(`airmode-codeview-close-${name}`);
    });

    it(`hides the floating close button in ${name} frame mode codeview`, () => {
      cy.visit(url.replace('airmode.html', 'default.html'));
      cy.get('.note-editor', { timeout: 5000 }).should('exist');
      cy.get('.note-toolbar .btn-codeview').click();

      cy.get('.note-editor').should('have.class', 'codeview');
      cy.get('.note-air-codeview-close').should('not.exist');
    });

    it(`exits codeview when the ${name} floating close button is clicked`, () => {
      cy.visit(url);
      cy.get('.note-editor', { timeout: 5000 }).should('exist');
      cy.get('.note-air-popover', { timeout: 5000 }).should('exist');
      cy.get('.note-editable').first().then(($editable) => {
        const rect = $editable[0].getBoundingClientRect();
        const selectX = rect.left + 40;
        const selectY = rect.top + 20;
        $editable.trigger('mousedown', { clientX: selectX, clientY: selectY });
        cy.wrap($editable).trigger('mouseup', { clientX: selectX, clientY: selectY });
      });
      cy.get('.note-air-popover .btn-codeview').click({ force: true });

      cy.get('.note-air-codeview-close').should('exist');
      cy.get('.note-air-codeview-close').click({ force: true });

      cy.get('.note-editor').should('not.have.class', 'codeview');
      cy.get('.note-air-codeview-close').should('not.exist');
    });
  });
});
