export default function CustomPaletteProvider(palette, create, elementFactory, translate) {
  this._palette = palette
  this._create = create
  this._elementFactory = elementFactory
  this._translate = translate
  palette.registerProvider(this)
}

CustomPaletteProvider.$inject = ['palette', 'create', 'elementFactory', 'translate']

CustomPaletteProvider.prototype.getPaletteEntries = function () {
  const create = this._create
  const elementFactory = this._elementFactory
  const translate = this._translate

  function createUserTask(event) {
    const shape = elementFactory.createShape({ type: 'bpmn:UserTask' })
    create.start(event, shape)
  }

  return {
    'create.user-task': {
      group: 'activity',
      className: 'bpmn-icon-user-task',
      title: translate('Create user task'),
      action: {
        dragstart: createUserTask,
        click: createUserTask
      }
    }
  }
}
