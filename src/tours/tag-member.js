module.exports = [{
  target: '#tags-field',
  content: 'tours.tag-member.TAG_NAME_LABEL',
  params: {
    placement: 'top',
    clickOnPrevious: '#close-action',
    previousDelay: 500
  }
}, {
  target: '#apply-button',
  content: 'tours.tag-member.ADD_TAG_LABEL',
  params: {
    placement: 'left',
    clickOnNext: '#close-action',
    nextDelay: 500
  }
}]
