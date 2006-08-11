/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2006 by 1&1 Internet AG, Germany, http://www.1and1.org

   License:
     LGPL 2.1: http://www.gnu.org/licenses/lgpl.html

   Authors:
     * Sebastian Werner (wpbasti)
     * Andreas Ecker (ecker)

************************************************************************ */

/* ************************************************************************

#module(listview)

************************************************************************ */

qx.OO.defineClass("qx.ui.listview.ListViewHeader", qx.ui.layout.HorizontalBoxLayout,
function(vColumns)
{
  qx.ui.layout.HorizontalBoxLayout.call(this);

  // This fixes the innerWidth calculation difference between the grid(pane) and the head.
  this.setPaddingRight(qx.ui.core.Widget.SCROLLBAR_SIZE);


  // ************************************************************************
  //   STORE REFERENCE TO CONFIG ENTRY
  // ************************************************************************
  this._columns = vColumns;


  // ************************************************************************
  //   CREATE HEADER CELLS
  // ************************************************************************
  var vHeadCell, vHeadSeparator;

  for (var vCol in vColumns)
  {
    vHeadCell = new qx.ui.listview.ListViewHeaderCell(vColumns[vCol], vCol);
    vHeadSeparator = new qx.ui.listview.ListViewHeaderSeparator;

    this.add(vHeadCell, vHeadSeparator);

    if (vColumns[vCol].align) {
      vHeadCell.setHorizontalChildrenAlign(vColumns[vCol].align);

      if (vColumns[vCol].align == qx.constant.Layout.ALIGN_RIGHT) {
        vHeadCell.setReverseChildrenOrder(true);
      }
    }

    // store some additional data
    vColumns[vCol].contentClass = qx.OO.classes["qx.ui.listview.ListViewContentCell" + qx.lang.String.toFirstUp(vColumns[vCol].type || "text")];
    vColumns[vCol].headerCell = vHeadCell;
  }


  // ************************************************************************
  //   ADD EVENT LISTENERS
  // ************************************************************************
  this.addEventListener(qx.constant.Event.MOUSEMOVE, this._onmousemove);
  this.addEventListener(qx.constant.Event.MOUSEDOWN, this._onmousedown);
  this.addEventListener(qx.constant.Event.MOUSEUP, this._onmouseup);
  this.addEventListener(qx.constant.Event.MOUSEOUT, this._onmouseout);
});

qx.OO.changeProperty({ name : "appearance", type : qx.constant.Type.STRING, defaultValue : "list-view-header" });



/*
---------------------------------------------------------------------------
  RESIZE SYNC
---------------------------------------------------------------------------
*/

qx.Proto._syncColumnWidth = function(vWidth)
{
  var vChildren = this.getChildren();
  var vColumn = Math.ceil(vChildren.indexOf(this._resizeCell) / 2);

  this.getParent().getPane().setColumnWidth(vColumn, vWidth);
}

qx.Proto._syncResizeLine = function()
{
  qx.ui.core.Widget.flushGlobalQueues();

  var vParent = this.getParent();
  var vLine = vParent.getResizeLine();
  var vLeft = qx.dom.DomLocation.getPageBoxLeft(this._resizeSeparator.getElement()) - qx.dom.DomLocation.getPageInnerLeft(this.getElement());
  var vTop = qx.dom.DomDimension.getBoxHeight(vParent.getHeader().getElement());
  var vHeight = qx.dom.DomDimension.getBoxHeight(vParent.getElement()) - vTop;

  vLine._applyRuntimeTop(vTop);
  vLine._applyRuntimeHeight(vHeight);
  vLine._applyRuntimeLeft(vLeft);

  vLine.removeStyleProperty(qx.constant.Style.PROPERTY_VISIBILITY);
}




/*
---------------------------------------------------------------------------
  EVENT HANDLER
---------------------------------------------------------------------------
*/

qx.Proto._mshtml = qx.sys.Client.isMshtml();

qx.Proto._onmousemove = function(e)
{
  if (!this.getParent().getResizable()) {
    return;
  }

  if (this._resizingActive)
  {
    // Slow down mshtml a bit
    if (this._mshtml)
    {
      if ((new Date).valueOf() - this._last < 50) {
        return;
      }

      this._last = (new Date).valueOf();
    }

    var vNewLeft = e.getPageX();
    var vSizeDiff = vNewLeft - this._resizeStart;
    var vCell = this._resizeCell;

    vCell.setWidth(Math.max(4, vCell.getWidth() + vSizeDiff));
    this._resizeStart = vNewLeft;

    if (this.getParent().getLiveResize())
    {
      this._syncColumnWidth(vCell._computeBoxWidth());
    }
    else
    {
      this._syncResizeLine();
    }
  }
  else
  {
    var vTarget = e.getTarget();
    var vEventPos = e.getPageX();
    var vTargetPosLeft = qx.dom.DomLocation.getPageBoxLeft(vTarget.getElement());
    var vTargetPosRight = vTargetPosLeft + qx.dom.DomDimension.getBoxWidth(vTarget.getElement());

    var vResizeCursor = false;
    var vResizeSeparator = null;

    if (vTarget instanceof qx.ui.listview.ListViewHeaderSeparator)
    {
      vResizeCursor = true;
      vResizeSeparator = vTarget;
    }
    else if ((vEventPos - vTargetPosLeft) <= 10)
    {
      // Ignore first column
      if (!vTarget.isFirstChild())
      {
        vResizeCursor = true;
        vResizeSeparator = vTarget.getPreviousSibling();
      }
    }
    else if ((vTargetPosRight - vEventPos) <= 10)
    {
      vResizeCursor = true;
      vResizeSeparator = vTarget.getNextSibling();
    }

    if (!(vResizeSeparator instanceof qx.ui.listview.ListViewHeaderSeparator))
    {
      vResizeSeparator = vTarget = vResizeCursor = null;
    }

    // Check if child is marked as resizable
    else if (vResizeSeparator)
    {
      var vResizeCell = vResizeSeparator.getPreviousSibling();

      if (vResizeCell && (vResizeCell._computedWidthTypePercent || vResizeCell._config.resizable == false)) {
        vResizeSeparator = vTarget = vResizeCursor = null;
      }
    }

    // Apply global cursor
    this.getTopLevelWidget().setGlobalCursor(vResizeCursor ? "e-resize" : null);

    // Store data for mousedown
    this._resizeSeparator = vResizeSeparator;
    this._resizeTarget = vTarget;
  }
}

qx.Proto._onmousedown = function(e)
{
  if (!this._resizeSeparator) {
    return;
  }

  this._resizingActive = true;
  this._resizeStart = e.getPageX();
  this._resizeCell = this._resizeSeparator.getPreviousSibling();

  if (!this.getParent().getLiveResize()) {
    this._syncResizeLine();
  }

  this.setCapture(true);
}

qx.Proto._onmouseup = function(e)
{
  if (!this._resizingActive) {
    return;
  }

  this._syncColumnWidth(this._resizeCell.getBoxWidth());

  this.setCapture(false);
  this.getTopLevelWidget().setGlobalCursor(null);

  // Remove hover effect
  this._resizeTarget.removeState(qx.ui.core.Widget.STATE_OVER);

  // Hide resize line
  this.getParent().getResizeLine().setStyleProperty(qx.constant.Style.PROPERTY_VISIBILITY, qx.constant.Core.HIDDEN);

  this._cleanupResizing();
}

qx.Proto._onmouseout = function(e)
{
  if (!this.getCapture()) {
    this.getTopLevelWidget().setGlobalCursor(null);
  }
}

qx.Proto._cleanupResizing = function()
{
  delete this._resizingActive;

  delete this._resizeSeparator;
  delete this._resizeTarget;
  delete this._resizeStart;
  delete this._resizeCell;
}










/*
---------------------------------------------------------------------------
  DISPOSER
---------------------------------------------------------------------------
*/

qx.Proto.dispose = function()
{
  if (this.getDisposed()) {
    return;
  }

  this._cleanupResizing();

  this.removeEventListener(qx.constant.Event.MOUSEMOVE, this._onmousemove);
  this.removeEventListener(qx.constant.Event.MOUSEDOWN, this._onmousedown);
  this.removeEventListener(qx.constant.Event.MOUSEUP, this._onmouseup);
  this.removeEventListener(qx.constant.Event.MOUSEOUT, this._onmouseout);

  this._columns = null;

  return qx.ui.layout.HorizontalBoxLayout.prototype.dispose.call(this);
}
