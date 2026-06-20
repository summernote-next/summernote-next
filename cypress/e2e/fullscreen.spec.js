describe('summernote classic fullscreen', () => {
  beforeEach(() => {
    cy.visit('/summernote-next-classic/default.html');
    cy.get('.note-editor', { timeout: 5000 }).should('exist');
  });

  it('makes the editor fill the viewport when entering fullscreen', () => {
    cy.viewport(1280, 800);

    cy.get('.note-editor .btn-fullscreen').click();

    cy.get('.note-editor.fullscreen').then(($editor) => {
      const styles = window.getComputedStyle($editor[0]);
      expect(styles.position).to.equal('fixed');
      expect(parseFloat(styles.height)).to.equal(800);
      expect(parseFloat(styles.width)).to.equal(1280);
      expect($editor.parent().is('body')).to.equal(true);
    });

    cy.screenshot('fullscreen-on');
  });

  it('restores the editor to its original position when exiting fullscreen', () => {
    cy.viewport(1280, 800);

    cy.get('.note-editor .btn-fullscreen').click();
    cy.get('.note-editor.fullscreen').should('exist');
    cy.get('.note-editor .btn-fullscreen').click();

    cy.get('.note-editor.fullscreen').should('not.exist');
    cy.get('html').should('not.have.class', 'note-fullscreen-body');
    cy.get('.note-editor').then(($editor) => {
      expect($editor.parent().is('body')).to.equal(false);
    });

    cy.screenshot('fullscreen-off');
  });
});
