import { Color, rect, pt } from "lively.graphics";
import { morph, Icon } from "lively.morphic";
import { removeUnreachableObjects } from "lively.serializer2/snapshot-navigation.js";
import { obj } from "lively.lang";
import { connect } from "lively.bindings";

export var migrations = [

  {
    date: "2017-04-08",
    name: "Text and Label textAndAttributes format change",
    description: `
Changing the format from
  [[string1, attr1_1, attr1_2], [string2, attr2_1, attr2_2], ...]
to
  [string1, attr1, string2, attr2, ...].
    `,
    snapshotConverter: idAndSnapshot => {
      let {snapshot} = idAndSnapshot;
      for (let key in snapshot) {
        let serialized = snapshot[key],
            textAndAttributes = serialized.props && serialized.props.textAndAttributes;
        if (!textAndAttributes) continue;
        let {value} = textAndAttributes;
        if (!Array.isArray(value)) {
          console.warn(`object migrator found textAndAttributes field but it is not an Array!`);
          continue;
        }
        if (!value.length || typeof value[0] === "string") continue; // OK
        // flatten values
        value = [].concat.apply([], value);
        for (let i = 0; i < value.length; i += 2) {
          let text = value[i], attr = value[i+1];
          if (attr && Array.isArray(attr)) // merge multi-attributes
            value[i+1] = Object.assign({}, ...attr);
        }
        serialized.props.textAndAttributes = {...textAndAttributes, value};
      }
      return idAndSnapshot;
    }
  },


  {
    date: "2017-04-29",
    name: "Window button fix",
    description: `
A recent change in the structure of windows, that now adds a "button wrapper"
morph breaks old windows without it.
`,
    objectConverter: (idAndSnapshot, pool) => {
      let {snapshot, id} = idAndSnapshot,
          rootMorph = pool.refForId(id).realObj;
      if (rootMorph && rootMorph.isMorph)
        rootMorph.withAllSubmorphsDo(win => {
          if (!win.isWindow || win.submorphs.some(m => m.name === "button wrapper")) return;

          let btnWrapper = morph({
            name: "button wrapper",
            styleClasses: ["buttonGroup"],
            submorphs: win.buttons()
          });
          win.controls = [btnWrapper, win.titleLabel()];
          if (win.resizable) win.controls.push(win.resizer());
          win.submorphs = [...win.submorphs, ...win.controls];
          btnWrapper.position = pt(0,0)
          win.buttons().forEach(ea => ea.extent = pt(14,14));
          win.getWindow().relayoutWindowControls();
        });
      return idAndSnapshot;
    }
  },

  {
    date: "2017-05-03",
    name: "Style Sheet Status Fix",
    description: `
State management of the style sheets has changes substantially, moving all of the style sheets that are being applied to the world.
`,
    snapshotConverter: idAndSnapshot => {
      let {id: rootId, snapshot} = idAndSnapshot;
      for (let id in snapshot) {
        let { props } = snapshot[id];
        if (!props || !props.styleSheets) continue;
        if (!props.styleSheets.value) props.styleSheets.value = [];
        props.styleSheets.value = props.styleSheets.value.filter(ea => {
          let styleSheet = snapshot[ea.id],
              rules = styleSheet.props.rules,
              rulesObj = snapshot[rules.value.id];
          return !styleSheet.props.styledMorphs && !('lively.serializer-class-info' in rulesObj);
        });
      }
      removeUnreachableObjects([rootId], snapshot);
      return idAndSnapshot;
    }
  },

  {
    date: "2017-05-22",
    name: "Removal of ChromeTheme and GithubTheme",
    description: `
For now only a simple default theme...
`,
    snapshotConverter: idAndSnapshot => {
      let {snapshot} = idAndSnapshot;
      for (let key in snapshot) {
        let serialized = snapshot[key],
            klass = serialized["lively.serializer-class-info"];
        if (!klass) continue;
        if (klass.className === "ChromeTheme" || klass.className === "GithubTheme") {
          klass.className = "DefaultTheme";
          klass.module.pathInPackage = "ide/themes/default.js";
        } else if (klass.className === "JavaScriptTokenizer") {
          delete serialized["lively.serializer-class-info"]
        }
      }
      return idAndSnapshot;
    }
  },

  {
    date: "2017-06-20",
    name: "Window Menu Button",
    description: `Requested by Dan, Windows now come with an additional window button.`,
    objectConverter: (idAndSnapshot, pool) => {
      let {id, snapshot} = idAndSnapshot;
      let rootMorph = pool.refForId(id).realObj;
      if (rootMorph && rootMorph.isMorph)
        rootMorph.withAllSubmorphsDo(win => {
          if (!win.isWindow || win.submorphs.some(m => m.name === "window menu button")) return;
          let menuButton = Icon.makeLabel("list", {
            styleClasses: ["windowTitleLabel"],
            fontSize: 15,
            nativeCursor: "pointer",
            padding: rect(5, 0, 0, 0),
            name: "window menu button"
          });
          win.controls = [...win.controls, menuButton];
          connect(menuButton, 'onMouseDown', win, 'openWindowMenu');
          if (win.resizable) win.controls.push(win.resizer());
          win.submorphs = [...win.submorphs, ...win.controls];
          win.buttons().forEach(ea => ea.extent = pt(14,14));
          win.getWindow().relayoutWindowControls();
        });
      return idAndSnapshot;
    }
  },

  {
    date: "2017-06-20",
    name: "Unwrapped Style Sheet Props",
    description: `Style Sheets now store foldable props in their nested format.`,
    objectConverter: (idAndSnapshot, pool) => {
      let {id, snapshot} = idAndSnapshot;
      let rootMorph = pool.refForId(id).realObj;
      if (rootMorph && rootMorph.isMorph)
        rootMorph.withAllSubmorphsDo(m => {
          if (m.styleSheets && m.styleSheets.length > 0) {
            m.styleSheets.forEach(ss => {
              for (let rule in obj.dissoc(ss.rules, ['_rev'])) 
                ss.rules[rule] = ss.unwrapFoldedProps(ss.rules[rule]);
            }) 
          }
        });
      return idAndSnapshot;
    }
  }

];
