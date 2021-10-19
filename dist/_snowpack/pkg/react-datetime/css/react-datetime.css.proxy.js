// [snowpack] add styles to the page (skip if no document exists)
if (typeof document !== 'undefined') {
  const code = "/*!\n * https://github.com/arqex/react-datetime\n */\n\n.rdt {\n  position: relative;\n}\n.rdtPicker {\n  display: none;\n  position: absolute;\n  min-width: 250px;\n  padding: 4px;\n  margin-top: 1px;\n  z-index: 99999 !important;\n  background: #fff;\n  box-shadow: 0 1px 3px rgba(0,0,0,.1);\n  border: 1px solid #f9f9f9;\n}\n.rdtOpen .rdtPicker {\n  display: block;\n}\n.rdtStatic .rdtPicker {\n  box-shadow: none;\n  position: static;\n}\n\n.rdtPicker .rdtTimeToggle {\n  text-align: center;\n}\n\n.rdtPicker table {\n  width: 100%;\n  margin: 0;\n}\n.rdtPicker td,\n.rdtPicker th {\n  text-align: center;\n  height: 28px;\n}\n.rdtPicker td {\n  cursor: pointer;\n}\n.rdtPicker td.rdtDay:hover,\n.rdtPicker td.rdtHour:hover,\n.rdtPicker td.rdtMinute:hover,\n.rdtPicker td.rdtSecond:hover,\n.rdtPicker .rdtTimeToggle:hover {\n  background: #eeeeee;\n  cursor: pointer;\n}\n.rdtPicker td.rdtOld,\n.rdtPicker td.rdtNew {\n  color: #999999;\n}\n.rdtPicker td.rdtToday {\n  position: relative;\n}\n.rdtPicker td.rdtToday:before {\n  content: '';\n  display: inline-block;\n  border-left: 7px solid transparent;\n  border-bottom: 7px solid #428bca;\n  border-top-color: rgba(0, 0, 0, 0.2);\n  position: absolute;\n  bottom: 4px;\n  right: 4px;\n}\n.rdtPicker td.rdtActive,\n.rdtPicker td.rdtActive:hover {\n  background-color: #428bca;\n  color: #fff;\n  text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.25);\n}\n.rdtPicker td.rdtActive.rdtToday:before {\n  border-bottom-color: #fff;\n}\n.rdtPicker td.rdtDisabled,\n.rdtPicker td.rdtDisabled:hover {\n  background: none;\n  color: #999999;\n  cursor: not-allowed;\n}\n\n.rdtPicker td span.rdtOld {\n  color: #999999;\n}\n.rdtPicker td span.rdtDisabled,\n.rdtPicker td span.rdtDisabled:hover {\n  background: none;\n  color: #999999;\n  cursor: not-allowed;\n}\n.rdtPicker th {\n  border-bottom: 1px solid #f9f9f9;\n}\n.rdtPicker .dow {\n  width: 14.2857%;\n  border-bottom: none;\n  cursor: default;\n}\n.rdtPicker th.rdtSwitch {\n  width: 100px;\n}\n.rdtPicker th.rdtNext,\n.rdtPicker th.rdtPrev {\n  font-size: 21px;\n  vertical-align: top;\n}\n\n.rdtPrev span,\n.rdtNext span {\n  display: block;\n  -webkit-touch-callout: none; /* iOS Safari */\n  -webkit-user-select: none;   /* Chrome/Safari/Opera */\n  -khtml-user-select: none;    /* Konqueror */\n  -moz-user-select: none;      /* Firefox */\n  -ms-user-select: none;       /* Internet Explorer/Edge */\n  user-select: none;\n}\n\n.rdtPicker th.rdtDisabled,\n.rdtPicker th.rdtDisabled:hover {\n  background: none;\n  color: #999999;\n  cursor: not-allowed;\n}\n.rdtPicker thead tr:first-of-type th {\n  cursor: pointer;\n}\n.rdtPicker thead tr:first-of-type th:hover {\n  background: #eeeeee;\n}\n\n.rdtPicker tfoot {\n  border-top: 1px solid #f9f9f9;\n}\n\n.rdtPicker button {\n  border: none;\n  background: none;\n  cursor: pointer;\n}\n.rdtPicker button:hover {\n  background-color: #eee;\n}\n\n.rdtPicker thead button {\n  width: 100%;\n  height: 100%;\n}\n\ntd.rdtMonth,\ntd.rdtYear {\n  height: 50px;\n  width: 25%;\n  cursor: pointer;\n}\ntd.rdtMonth:hover,\ntd.rdtYear:hover {\n  background: #eee;\n}\n\n.rdtCounters {\n  display: inline-block;\n}\n\n.rdtCounters > div {\n  float: left;\n}\n\n.rdtCounter {\n  height: 100px;\n}\n\n.rdtCounter {\n  width: 40px;\n}\n\n.rdtCounterSeparator {\n  line-height: 100px;\n}\n\n.rdtCounter .rdtBtn {\n  height: 40%;\n  line-height: 40px;\n  cursor: pointer;\n  display: block;\n\n  -webkit-touch-callout: none; /* iOS Safari */\n  -webkit-user-select: none;   /* Chrome/Safari/Opera */\n  -khtml-user-select: none;    /* Konqueror */\n  -moz-user-select: none;      /* Firefox */\n  -ms-user-select: none;       /* Internet Explorer/Edge */\n  user-select: none;\n}\n.rdtCounter .rdtBtn:hover {\n  background: #eee;\n}\n.rdtCounter .rdtCount {\n  height: 20%;\n  font-size: 1.2em;\n}\n\n.rdtMilli {\n  vertical-align: middle;\n  padding-left: 8px;\n  width: 48px;\n}\n\n.rdtMilli input {\n  width: 100%;\n  font-size: 1.2em;\n  margin-top: 37px;\n}\n\n.rdtTime td {\n  cursor: default;\n}\n";

  const styleEl = document.createElement("style");
  const codeEl = document.createTextNode(code);
  styleEl.type = 'text/css';
  styleEl.appendChild(codeEl);
  document.head.appendChild(styleEl);
}