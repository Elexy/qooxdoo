/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2011 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Tino Butz (tbtz)

************************************************************************ */
/* ************************************************************************

#require(qx.event.handler.Input)

************************************************************************ */

/**
 * EXPERIMENTAL - NOT READY FOR PRODUCTION
 */
qx.Class.define("qx.ui.mobile.form.Input",
{
  extend : qx.ui.mobile.core.Widget,
  include : [qx.ui.mobile.form.MValue],
  type : "abstract",


  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function(value)
  {
    this.base(arguments);

    this.initType();
    this.initSize();
    this.initMaxLength();
  },




  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    type :
    {
      check : "String",
      nullable : true,
      init : null,
      apply : "_applyAttribute"
    },


    size :
    {
      check : "Integer",
      nullable : true,
      init : null,
      apply : "_applyAttribute"
    },


    maxLength :
    {
      check : "Integer",
      nullable : true,
      init : null,
      apply : "_applyAttribute"
    }
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    // overridden
    _getTagName : function()
    {
      return "input";
    }
  }
});
