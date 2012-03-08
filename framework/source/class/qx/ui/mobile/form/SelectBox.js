/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2011 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Gabriel Munteanu (gabios)
     * Christopher Zuendorf (czuendorf)

************************************************************************ */

/**
 * EXPERIMENTAL - NOT READY FOR PRODUCTION
 *
 * The SelectBox
 *
 * an example of what can be done with the SelectBox:
 * *Example*
 *
 * <pre class='javascript'>
 *     var page1 = new qx.ui.mobile.page.Page();
 *     page1.addListener("initialize", function()
 *     {
 *       var sel = new qx.ui.mobile.form.SelectBox();
 *       page1.add(sel);
 *       var model = new qx.data.Array(["item1","item2"]);
 *       sel.setModel(model);
 *       dd.push("item3");
 *
 *
 *       var but = new qx.ui.mobile.form.Button("setSelection");
 *       page1.add(but);
 *       but.addListener("tap", function(){
 *         sel.setSelection("item3");
 *       }, this);
 *
 *       var title = new qx.ui.mobile.form.Title("item2");
 *       title.bind("value",sel,"value");
 *       sel.bind("value",title,"value");
 *       page1.add(title);
 *     },this);
 *
 *   page1.show();
 *  </pre>
 */
qx.Class.define("qx.ui.mobile.form.SelectBox",
{
  extend : qx.ui.mobile.core.Widget,
  include : [
    qx.ui.mobile.form.MValue,
    qx.ui.form.MForm
  ],
  implement : [
    qx.ui.form.IForm,
    qx.ui.form.IModel
  ],

  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param value {var?null}, The initial value of the widget.
   * @param isNativeMode {boolean?false}, defines if a native browser HTML SelectBox, 
   *        or a label with a selected value is shown. Default: false.
   */
  construct : function(value, isNativeMode)
  {
    if(isNativeMode) {
      this.__nativeMode = isNativeMode;
    }

    this.base(arguments);

    this._createSelectionList();

    // Create the list with a delegate that
    // configures the list item.
    this.__selectionList = this._createSelectionList();

    // Selection dialog creation.
    this.__selectionDialog = this._createSelectionDialog(this.__selectionList);

  },


  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {

    // overridden
    defaultCssClass :
    {
      refine : true,
      init : "selectbox"
    },
    
    // overridden
    activatable :
    {
      refine :true,
      init : true
    },

    /**
     * The model to use to render the list.
     */
    model :
    {
      check : "qx.data.Array",
      apply : "_applyModel",
      event: "changeModel",
      nullable : true,
      init : null
    }
  },

  members :
  {
    __selectedIndex : null,
    __selectionDialog : null,
    __selectionList : null,
    __selectionDialogTitle : null,
    __nativeMode : false,

    // overridden
    _getTagName : function()
    {
      var tagName = "select";
      
      if(!this.isNativeMode()) {
        tagName = "div";
      }
      return tagName;
    },


    // overridden
    _createContainerElement : function()
    {
      var containerElement = this.base(arguments);

      if(!this.isNativeMode()) {
        var showSelectionDialog = qx.lang.Function.bind(this.__showSelectionDialog, this);

        qx.bom.Event.addNativeListener(containerElement, "tap", showSelectionDialog, false);
        qx.bom.Event.addNativeListener(containerElement, "click", showSelectionDialog, false);
        qx.bom.Event.addNativeListener(containerElement, "focus", showSelectionDialog, false);
      }

      return containerElement;
    },


    /**
     * Creates the selection list. Override this to customize the widget.
     *
     * @return value {qx.ui.mobile.list.List} The selection list
     */
    _createSelectionList : function() {
      var self = this;
      var selectionList = new qx.ui.mobile.list.List({
        configureItem : function(item, data, row)
        {
          item.setTitle(data);
          item.setShowArrow(false);

          var isSelected = (self.__selectedIndex == row);

          var selectedClassName = "selectbox-selected";
          var unselectedClassName = "selectbox-unselected";

          item.removeCssClass(selectedClassName);
          item.removeCssClass(unselectedClassName);

          if(isSelected){
            item.addCssClass(selectedClassName);
          } else{
            item.addCssClass(unselectedClassName);
          }
        }
      });

      // Add an changeSelection event
      selectionList.addListener("changeSelection", this.__closeSelectionDialog, this);
      return selectionList;
    },


    /**
     * Creates the selection dialog. Override this to customize the widget.
     *
     * @param selectionList {qx.ui.mobile.list.List} The selection list that 
     *        should be added to the dialog
     * @return value {qx.ui.mobile.dialog.Dialog} The selection list
     */
    _createSelectionDialog : function(selectionList) {
      return new qx.ui.mobile.dialog.Dialog(selectionList);
    },


    /**
     * Refreshs dialogs list model, and display the selectionDialog.
     */
    __showSelectionDialog : function (e) {
      this.__selectionList.setModel(null);
      this.__selectionList.setModel(this.getModel());

      if(this.__selectionDialogTitle) {
        this.__selectionDialog.setTitle(this.__selectionDialogTitle);
      }

      this.__selectionDialog.show();
    },


    /**
     * Closes the selection dialog, changes the selectedIndex, and triggers
     * rendering of SelectBox.
     */
    __closeSelectionDialog : function (evt) {
      this.__selectedIndex = evt.getData();
      this._render();
      this.__selectionDialog.hide();
    },


    /**
     * Returns the selected value of the element
     * @return value {String} the value of the selection
     */
    getSelection : function() {
      console.log("getSelection():");
      return this.getValue();
    },


    /**
     * Sets the selected value of the element
     * @param value {String} the value of the selection
     */
    setSelection : function(value) {
      console.log("setSelection():"+value);
      this.setValue(value);
    },


    /**
    * Sets the SelectionDialog title
    * @param value {String} title of SelectionDialog
    */
    setSelectionDialogTitle : function(value) {
      this.__selectionDialogTitle = value;
    },


    /**
     * Sets the value of this selectbox.
     * It is called by setValue method of qx.ui.mobile.form.MValue mixin.
     * Implements the way the value is set for the element.
     * @param value {String} the new value of the selectbox
     */
    _setValue : function(value) {
      var model = this.getModel();
      this.getContainerElement().selectedIndex = model.indexOf(value);
    },


    /**
     * Renders the selectbox. Override this if you would like to display the
     * values of the select box in a different way than the default.
     */
    _render : function() {
      // Clear HTML content.
      this._setHtml("");
      
      // Then recreate content.
      var contentElement = this.getContentElement();
      
      var selectedItem = this.getModel().toArray()[0];
      if(this.__selectedIndex){
        var selectedItem = this.getModel().toArray()[this.__selectedIndex];
      }
      
      
      if (this.isNativeMode()) {
        for(var i=0, l=this.getModel().getLength(); i<l; i++)
        {
          var item = this.getModel().getItem(i);

          var option = qx.bom.Element.create("option");
          qx.bom.element.Attribute.set(option,"value",item);
          option.appendChild(document.createTextNode(item));

          if(i===this.__selectedIndex || (this.__selectedIndex==null && i===0)) {
            qx.bom.element.Attribute.set(option,"selected","true");
          }
          contentElement.appendChild(option);
        }
      } else {
        // This text node is for compatibility reasons, because Firefox can not
        // change appearance of select boxes. 
        var inputElement = new qx.bom.Element.create("input");
        qx.bom.element.Attribute.set(inputElement,"type","text");
        qx.bom.element.Attribute.set(inputElement,"value",selectedItem);
        qx.bom.element.Attribute.set(inputElement,"readonly","readonly");
        inputElement.className += " selectbox-input";
        
        var labelElement = new qx.bom.Element.create("div");
        labelElement.className += " selectbox-label";
        
        labelElement.appendChild(inputElement);
        
        contentElement.appendChild(labelElement);

        var arrowElement = new qx.bom.Element.create("div");
        arrowElement.className += " selectbox-arrow";
        contentElement.appendChild(arrowElement);
      }
      
      this._domUpdated();
    },
    
    
    /**
     * Sets the model property to the new value
     * @param value {qx.data.Array}, the new model
     * @param old {qx.data.Array?}, the old model
     */
    _applyModel : function(value, old){
      value.addListener("change", this._render, this);
      if (old != null) {
        old.removeListener("change", this._render, this);
      }

      this._render();
    },
    
    
    /**
     * Returns boolean if native mode is active.
     * Native mode means, that a native select box is shown.
     * @return value {boolean}, if nativeMode active.
     */
    isNativeMode : function() {
      return this.__nativeMode;
    },
    
    
    /**
     * Defines whether a native select box should be shown, or
     * a cross-browser-safe label with a popup.
     * @param nativeMode {boolean}, new nativeMode value.
     */
    setNativeMode : function(nativeMode) {
      this.__nativeMode = nativeMode;
    }
    
  }
  ,

  /*
  *****************************************************************************
      DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    this._disposeObjects("__selectionDialog","__selectionList");
  }
});