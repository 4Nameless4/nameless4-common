export function walk<T>(
  data: T | T[],
  call: (data: T, deep: number, pre: T | null) => boolean | void | undefined,
  getChildren: (
    data: T,
    deep: number,
    pre: T | null
  ) => T[] | false | void | undefined
) {
  let deep = 0;
  let pre: T | null = null;
  function _walk(data: T) {
    const result = call(data, deep, pre);
    const children = getChildren(data, deep, pre);
    pre = data;
    deep++;
    if (children && !result) {
      children.forEach((d) => {
        _walk(d);
      });
    }
  }
  if (Array.isArray(data)) {
    data.forEach((d) => {
      _walk(d);
    });
  } else {
    _walk(data);
  }
}

export function randomColor(
  colors: string[] = [
    "#03A9F4",
    "#757575",
    "#ff9a9e",
    "#fbc2eb",
    "#f6d365",
    "#d4fc79",
    "#30cfd0",
    "#a8edea",
    "#fed6e3",
    "#96fbc4",
    "#d9ded8",
    "#BC9F77",
    "#4F726C",
    "#E03C8A",
  ]
) {
  const colorMap = new Map<string | number, string>();
  let count = 0;
  return function (key: string | number) {
    if (colorMap.has(key)) {
      return colorMap.get(key);
    } else {
      const c = colors[count];
      colorMap.set(key, c);
      count++;
      if (colors.length === count) {
        count = 0;
      }
      return c;
    }
  };
}
// 获得不重复的ID
// 如果id已存在将加入指定参数和计数
export function getID() {
  const idGroup = new Set();

  return function (
    preid: string,
    props: {
      suffix?: string;
      warn?: (preid: string, nowid: string) => string;
    } = {}
  ) {
    const { suffix, warn } = props;
    let id = preid;
    let count = 0;
    while (idGroup.has(id)) {
      count++;
      id = preid + count + (suffix || "");
    }
    idGroup.add(id);
    if (id !== preid && warn) {
      console.warn(warn(preid, id));
    }
    return id;
  };
}

export function isClient() {
  return document && typeof document !== "undefined";
}

export interface t_mzw_zoompan {
  scale: number;
  translate: [number, number];
}

// 获取给定Element的transform值（translate与scale）
export function getTransform(el: Element): t_mzw_zoompan {
  const defaultResult: t_mzw_zoompan = {
    scale: 1,
    translate: [0, 0],
  };
  const transform = el.getAttribute("transform");
  if (!transform) return defaultResult;
  const translate = (transform.match(/translate\([^)]+\)/) || "")[0];
  const scale = (transform.match(/scale\([^)]+\)/) || "")[0];

  const t = [...translate.matchAll(/[-.\d]+/g)];
  const s = [...scale.matchAll(/[-.\d]+/g)];

  return {
    scale: Number(s[0]) || 1,
    translate: [Number(t[0]) || 0, Number(t[1]) || 0],
  };
}

export function _getSVGInfo(
  SVGRect: { x: number; y: number; width: number; height: number },
  viewbox: [number, number, number, number]
) {
  // svg的viewbox与实际的width、height的比例
  // 为了换算出 缩放中心点（屏幕坐标系）在 svg 未缩放平移时对应的(svg坐标系)坐标
  const rw = viewbox[2] / SVGRect.width;
  const rh = viewbox[3] / SVGRect.height;
  const autoSizeRatio = Math.max(rw, rh);
  return {
    SVGRect,
    viewbox,
    rw,
    rh,
    autoSizeRatio,
  };
}

export function getSVGInfo(svg: SVGSVGElement) {
  const SVGRect = svg.getBoundingClientRect();
  const viewbox: [number, number, number, number] = [
    svg.viewBox.baseVal.x,
    svg.viewBox.baseVal.y,
    svg.viewBox.baseVal.width,
    svg.viewBox.baseVal.height,
  ];

  return _getSVGInfo(SVGRect, viewbox);
}

export function pointer(
  clientPos: [number, number],
  svgEl: SVGSVGElement
): [number, number] {
  const { SVGRect, viewbox, rw, autoSizeRatio } = getSVGInfo(svgEl);

  // zoom center 在屏幕坐标系下，需要缩放的中心点相对于svg左上角的偏移量
  const centerClientPos = [clientPos[0] - SVGRect.x, clientPos[1] - SVGRect.y];

  // 补偿 svg viewbox和svg 实际大小不一致时 svg的自适应造成的位移
  const autosizeOffsetPX = (SVGRect.width - SVGRect.height) / 2;
  const isWidth = rw === autoSizeRatio;
  const offset = autosizeOffsetPX * autoSizeRatio;

  const autosizeOffset = [offset * Number(!isWidth), offset * Number(isWidth)];

  // zoom 中心坐标（SVG坐标系，未transform时的坐标）
  const centerPos = centerClientPos.map(
    (d, i) =>
      d * autoSizeRatio +
      viewbox[i] -
      ((autoSizeRatio !== 1 && autosizeOffset[i]) || 0)
  ) as [number, number];

  return centerPos;
}

export function pointerInvert(
  transform: t_mzw_zoompan,
  pointer: [number, number]
): [number, number] {
  // 补偿 svg translate的值（要求transform时translate在scale前面）
  // transform时 translate(-30 120) scale(1.2) 是指 先平移 在缩放，缩放的值不包含之前平移的（因为已经平移过了）
  // zoom 中心坐标（SVG坐标系，transform后的坐标）
  const centerOriginPos = pointer.map(
    (d, i) => (d - transform.translate[i]) / transform.scale
  ) as [number, number];
  return centerOriginPos;
}

export function scaleTo(
  to: number,
  scaleRange: [number, number] = [0, Infinity]
): number {
  return Math.max(Math.min(to, scaleRange[1]), Math.max(scaleRange[0], 0.1));
}

export function svgPointerInvert(props: {
  svg: SVGSVGElement;
  transformEL: Element;
  clientPos: [number, number];
}) {
  const { transformEL, clientPos, svg } = props;
  const transform = getTransform(transformEL);
  const svgPointer = pointer(clientPos, svg);
  const svgPointerTransform = pointerInvert(transform, svgPointer);
  return {
    transform,
    svgPointer,
    svgPointerTransform,
  };
}

export function zoom(props: {
  scaleOffset: number;
  svg: SVGSVGElement;
  transformEL: Element;
  clientPos: [number, number];
  scaleRange?: [number, number];
}): t_mzw_zoompan {
  const { scaleOffset, transformEL, scaleRange, clientPos, svg } = props;

  const { transform, svgPointerTransform } = svgPointerInvert({
    clientPos,
    svg,
    transformEL,
  });

  const to = scaleTo(scaleOffset + transform.scale, scaleRange);

  const _scaleOffset = to - transform.scale;
  // 需要把scale 放大的坐标在已有的位移情况下给补偿回来，所以 [现有平移位置 - 原位置的坐标 * 放大的偏移值]
  // 原位置的坐标 * 放大的偏移值 才能得到scale之后放大的量，因为 transform 中translate 在 scale前面，translate没有被scale
  const translateX =
    transform.translate[0] - svgPointerTransform[0] * _scaleOffset;
  const translateY =
    transform.translate[1] - svgPointerTransform[1] * _scaleOffset;

  return {
    scale: to,
    translate: [translateX, translateY],
  };
}

export function pan(
  clientStartPos: [number, number],
  svg: SVGSVGElement,
  transformEL: Element,
  change: (translate: [number, number]) => void
) {
  const clientPosStart: [number, number] = clientStartPos;
  const { translate } = getTransform(transformEL);

  const { autoSizeRatio } = getSVGInfo(svg);

  const signal = new AbortController();
  function pointermove(event: PointerEvent) {
    const clientPosMove: [number, number] = [event.clientX, event.clientY];

    const translateOffset = clientPosMove.map((d, i) => d - clientPosStart[i]);
    change([
      translate[0] + translateOffset[0] * autoSizeRatio,
      translate[1] + translateOffset[1] * autoSizeRatio,
    ]);
  }
  function pointerup() {
    signal.abort();
  }

  svg.addEventListener("pointermove", pointermove, {
    signal: signal.signal,
  });
  svg.addEventListener("pointerup", pointerup, { signal: signal.signal });
}
