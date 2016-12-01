import { Window, GridLayout, FillLayout, Ellipse, Text,
         VerticalLayout, HorizontalLayout, Image, Triangle,
         TilingLayout, Morph, morph, Menu, Path } from "../../index.js";
import { Rectangle, Color, LinearGradient, pt, Point, rect,
         materialDesignColors, flatDesignColors, RadialGradient,
         webSafeColors, Complementary, Triadic, Tetradic, Quadratic,
         Analagous, Neutral} from "lively.graphics";
import { obj, num, arr, properties } from "lively.lang";
import { signal, connect, disconnect } from "lively.bindings";
import { ValueScrubber, CheckBox, ModeSelector, DropDownSelector,
         Slider, PropertyInspector } from "../../widgets.js";
import { ColorPickerField } from "./color-picker.js";
import { GradientEditor } from "./gradient-editor.js";
import { Icon } from "../../icons.js";

class StyleEditor extends Morph {

   constructor(props) {
      const {title} = props;
      super({
        name: "BorderStyler",
        dropShadow: true,
        draggable: true,
        borderColor: Color.gray,
        borderWidth: 4,
        fill: Color.black.withA(.7),
        borderRadius: 15,
        layout: new VerticalLayout({spacing: 5}),
        ...props,
        submorphs: [{
           fill: Color.transparent,
           layout: new HorizontalLayout(),
           onDrag: (evt) => this.onDrag(evt),
           submorphs: [{
             type: "text", fontWeight: "bold", padding: 5,
             fontColor: Color.gray, fontSize: 12, readOnly: true,
             textString: title, fill: Color.transparent, draggable: true,
             onDrag: (evt) => this.onDrag(evt)
        }]
    }]});
   }

   onMouseDown() { this.open() }

   close() {
      this.active = false;
      signal(this, "close", false);
      this.remove()
   }

   async open() {
      if (this.active) return;
      const [wrapper] = this.submorphs,
            {submorphs: [instruction]} = wrapper,
            duration = 200;
      this.layout = null;
      wrapper.addMorphAt(Icon.makeLabel("times-circle-o", {
           fontSize: 22, fontColor: Color.gray.darker(),
           nativeCursor: "pointer", onMouseDown: () => this.close()}), 0);
      instruction.animate({fontColor: Color.gray.darker(), duration});
      this.controls(this.target).forEach(c => {
         c.opacity = 0;
         this.addMorph(c).animate({opacity: 1, duration});
      });
      this.animate({
          fill: Color.gray.lighter(),
          borderWidth: 1, borderRadius: 7,
          borderColor: Color.gray,
          duration, layout: new VerticalLayout({spacing: 5})
      });
      this.active = true;
      return false;
   }

   get isHaloItem() { return true }

   createControl(name, controlElement) {
     return {
      fill: Color.transparent,
      draggable: true, onDrag: (evt) =>  this.onDrag(evt),
      layout: new VerticalLayout({spacing: 5}),
      submorphs: [
        {type: "text", textString: name, fontSize: 12, fontWeight: 'bold',
         fontColor: Color.black, padding: rect(5,0,0,0),
         fill: Color.transparent},
        controlElement
     ]}
  }

  createSelectableControl({controls, init}) {
      const modeSelector = new ModeSelector({name: "modeSelector", items: controls, init, width: this.width}),
            selectableControl = new Morph({
              fill: Color.transparent,
              draggable: true, onDrag: (evt) =>  this.onDrag(evt),
              layout: new VerticalLayout({spacing: 10}),
              select(control) {
                 // rms: animating submorphs currently starts animations "too early", meaning,
                 //      that animations are already triggering when the first morph is being removed
                 //      instead of waiting until all submorph changes have been applied.
                 //      this is a hack that prevents this bug from affecting the animations.
                 const c = control();
                 this.layout.autoResize = false;
                 c.opacity = 0; c.animate({opacity: 1, duration: 300})
                 this.submorphs = [this.get("modeSelector"), c];
                 this.animate({layout: new VerticalLayout({spacing: 10}), duration: 300});
              },
              submorphs: [modeSelector]});
      connect(modeSelector, "switchLabel", selectableControl, "select");
      modeSelector.layout.col(0).remove();
      return selectableControl;
  }

  createToggledControl({title, render, target, property}) {
    if (!target || !property) throw Error("Please pass property AND target to toggled control.");
    const toggler = new CheckBox({checked: target[property]}),
          flap = new Morph({
            clipMode: "hidden",
            fill: Color.transparent,
            draggable: true, onDrag: (evt) =>  this.onDrag(evt),
            layout: new VerticalLayout({spacing: 5}),
            toggle(value) {
                if (value) {
                    value = this.memoizedValue || value;
                } else {
                    this.memoizedValue = target[property];
                }
                target[property] = value;
                const [title] = this.submorphs,
                      controls =  render(target[property]);
                this.animate({submorphs: [title, ...controls ? [controls] : []], duration: 300});
            },
            submorphs: [
              {fill: Color.transparent, layout: new HorizontalLayout(),
               submorphs: [
                {type: "text", textString: title, fontSize: 12, fontWeight: "bold",
                 fontColor: Color.black, padding: rect(5,0,0,0),
                 fill: Color.transparent},
                toggler]}
           ]});

     connect(toggler, "toggle", flap, "toggle");
     flap.toggle(target[property]);
     return flap;
  }


}

export class BodyStyleEditor extends StyleEditor {

   controls(target) {
       return [
           this.fillControl(target),
           this.opacityControl(target),
           this.shadowControl(target)
       ]
   }

   opacityControl(target) {
      return this.createControl("Opacity", new Slider({
             target, min: 0, max: 1,
             property: "opacity", width: 150
      }));
   }

   fillControl(target) {
      return this.createSelectableControl({controls: {
                "Fill": () => new ColorPickerField({target, property: "fill"}),
                "Gradient": () => new GradientEditor({target, property: "fill"})
             }, init: target.fill && target.fill.isGradient ? "Gradient" : "Fill"})
   }

   gradientControl(target) {
      return this.createControl("Gradient", new GradientEditor({target, property: "fill"}))
   }

   shadowControl() {
     return this.createToggledControl({
          title: "Drop Shadow",
          target: this.target, property: "dropShadow",
          render: (value) => {
             if (!value) return null;
             const distanceInspector = new PropertyInspector({
                  name: "distanceSlider",
                  min: 0, target: value,
                  property: "distance"
             }),
             angleSlider = new PropertyInspector({
                  name: "angleSlider",
                  min: 0, max: 360,
                  target: value,
                  property: "rotation"
             }),
             blurInspector = new PropertyInspector({
                 name: "blurSlider",
                 min: 0, target: value,
                 property: "blur"
             });
             const control = new Morph({
                  width: 150, height: 120, fill: Color.transparent,
                  layout: new GridLayout({
                      autoAssign: false,
                      fitToCell: false,
                      grid: [
                      ["distanceLabel", null, "distanceSlider"],
                      ["blurLabel", null, "blurSlider"],
                      ["angleLabel", null, "angleSlider"],
                      ["colorLabel", null, "colorPicker"]]}),
                  submorphs: [
                    {type: "label", value: "Distance: ", padding: 4, name: "distanceLabel"}, distanceInspector,
                    {type: "label", value: "Blur: ", padding: 4, name: "blurLabel"}, blurInspector,
                    {type: "label", value: "Angle: ", padding: 4, name: "angleLabel"}, angleSlider,
                    {type: "label", value: "Color: ", padding: 4, name: "colorLabel"},
                    new ColorPickerField({
                         target: value,
                         name: "colorPicker",
                         property: "color"
                    })]
               });
             control.layout.col(0).paddingLeft = 5;
             control.layout.row(0).paddingBottom = 5;
             control.layout.row(1).paddingBottom = 5;
             control.layout.row(2).paddingBottom = 5;
             return control;
          }
          })
  }

}

export class BorderStyleEditor extends StyleEditor {

  controls(target) {
     return [
         this.borderControl(target),
         this.clipControl(target)
      ]
  }

  clipControl(target) {
     return this.createControl("Clip Mode",
       {layout: new HorizontalLayout({spacing: 5}),
        fill: Color.transparent,
        submorphs: [
         new DropDownSelector({
             isHaloItem: true,
             target, property: "clipMode",
             values: ["visible", "hidden", "scroll"]
       })]
     });
  }

  borderControl(target) {
     return this.createControl("Border", {
             layout: new HorizontalLayout({spacing: 5, compensateOrigin: true}),
             fill: Color.transparent,
             submorphs: [new DropDownSelector({target, isHaloItem: true, property: "borderStyle", values: ["solid", "dashed", "dotted"]}),
                         new ColorPickerField({target, property: "borderColor"}),
                         new PropertyInspector({min: 0, target, unit: "pt", property: "borderWidth"})]
              })
  }

}

export class LayoutStyleEditor extends Morph {

    getLayoutObjects() {
       return [null,
               new HorizontalLayout({autoResize: false}),
               new VerticalLayout({autoResize: false}),
               new FillLayout(),
               new TilingLayout(),
               new GridLayout({grid: [[null], [null], [null]]})];
   }

   remove() {
       this.layoutHalo && this.layoutHalo.remove();
       super.remove();
   }

   async toggle() {
       const layoutHaloToggler = this.getSubmorphNamed("layoutHaloToggler"),
             layoutPicker = this.getSubmorphNamed('layoutPicker');
       if (this.layoutHalo) {
          this.active = false;
          this.halo.showStyleGuides(true);
          this.layout = null;
          this.submorphs = [this.getSubmorphNamed("layoutControlPickerWrapper")];
          layoutPicker.textString = this.getCurrentLayoutName();
          this.layoutHalo.remove(); this.layoutHalo = null;
          Icon.setIcon(layoutHaloToggler, "th");
          layoutHaloToggler.fontSize = 14; layoutHaloToggler.padding = 3;
          layoutHaloToggler.tooltip = "Show layout halo";
          await this.animate({
                layout: new HorizontalLayout(),
                duration: 300
          });
       } else {
          this.active = true;
          this.halo.showStyleGuides(false);
          this.layoutHalo = this.world().showLayoutHaloFor(this.target, this.pointerId);
          this.layout = null;
          this.submorphs = [...this.submorphs, ...this.layoutHalo.optionControls()]
          layoutPicker.textString = "Configure Layout";
          Icon.setIcon(layoutHaloToggler, "times-circle-o");
          layoutHaloToggler.fontSize = 22; layoutHaloToggler.padding = 0;
          layoutHaloToggler.tooltip = "Close layout halo";
          this.animate({
             layout: new VerticalLayout({spacing: 0}),
             duration: 300
          });
       }
       this.update(true);
   }

   getCurrentLayoutName() {
      return this.getLayoutName(this.target.layout);
   }

   getLayoutName(l) {
      return l ? l.name() + " Layout" : "No Layout";
   }

   openLayoutMenu(evt) {
     if (this.layoutHalo) return;
     var items = this.getLayoutObjects().map(l => {
       return [this.getLayoutName(l),
         () => {
             const p = this.getSubmorphNamed("layoutPicker");
             this.target.animate({layout: l,
                                  easing: "easeOutQuint"});
             p.textString = this.getLayoutName(l);
             p.fitIfNeeded();
             this.update();
         }]
       });
     var menu = this.world().openWorldMenu(evt, items);
     menu.globalPosition = this.getSubmorphNamed("layoutPicker").globalPosition;
     menu.isHaloItem = true;
   }

   update(animated) {
      const topCenter = this.target
                            .globalBounds()
                            .withX(0).withY(0)
                            .bottomCenter().addXY(50, 70),
            inspectButton = this.getSubmorphNamed('layoutHaloToggler');
      if (animated) {
         this.animate({topCenter, duration: 300});
      } else { this.topCenter = topCenter; }
      if (!this.target.layout) {
        inspectButton.opacity = .5;
        inspectButton.nativeCursor = null;
      } else {
        inspectButton.opacity = 1;
        inspectButton.nativeCursor = "pointer";
      }
   }

   constructor(props) {
       const {target} = props;
       super({
           name: "layoutControl",
           border: {radius: 15, color: Color.gray, width: 1},
           clipMode: "hidden", dropShadow: true,
           extent: pt(120, 75),
           fill: Color.gray.lighter(),
           layout: new VerticalLayout(),
           isHaloItem: true,
           ...props,
       });
       this.submorphs = [{
            name: "layoutControlPickerWrapper",
            fill: Color.transparent,
            layout: new HorizontalLayout({spacing: 5}),
            submorphs: [
               this.layoutHaloToggler(),
               this.layoutPicker()
           ]}];
       this.update(false);
   }

   layoutPicker() {
      return {
          type: 'text', fill: Color.transparent, name: "layoutPicker",
          padding: 2, readOnly: true,  fontColor: Color.black.lighter(),
          fontWeight: 'bold', nativeCursor: "pointer", padding: 3,
          fontStyle: 'bold', textString: this.getCurrentLayoutName(),
          onMouseDown: (evt) => this.openLayoutMenu(evt)
      }
   }

   layoutHaloToggler() {
      return Icon.makeLabel("th", {
                  name: "layoutHaloToggler",
                  nativeCursor: "pointer",
                  fontSize: 15, fontColor: Color.black.lighter(),
                  padding: 3,
                  tooltip: "Toggle layout halo",
                  onMouseDown: (evt) => {
                     this.target.layout && this.toggle();
                  }
               })
   }
}
