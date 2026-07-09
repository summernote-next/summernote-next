export default class Clipboard {
  constructor(context) {
    this.context = context;
    this.options = context.options;
    this.$editable = context.layoutInfo.editable;
  }

  initialize() {
    this.$editable.on('paste', this.pasteByEvent.bind(this));
  }

  /* @param {Event} */
  pasteByEvent(event) {

    if (this.context.isDisabled()) {
      return;
    }
    const clipboardData = event.originalEvent.clipboardData;

    if (clipboardData && clipboardData.items && clipboardData.items.length) {
      const clipboardFiles = clipboardData.files;
      const clipboardText = clipboardData.getData('Text');

      if (clipboardFiles.length > 0 && this.options.allowClipboardImagePasting) {
        this.context.invoke('editor.insertImagesOrCallback', clipboardFiles);
        event.preventDefault();
      }

      if (clipboardText.length > 0 && this.context.invoke('editor.isLimited', clipboardText.length)) {
        event.preventDefault();
      }
    } else if (window.clipboardData) {
      
      let text = window.clipboardData.getData('text');
      if (this.context.invoke('editor.isLimited', text.length)) {
        event.preventDefault();
      }
    }

    setTimeout(() => {
      this.context.invoke('editor.afterCommand');
    }, 10);
  }
}