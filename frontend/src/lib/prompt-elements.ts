export type PromptElement = {
  id: string;
  name: string;
  en: string;
  emoji: string;
};

export type PromptCategory = {
  id: string;
  title: string;
  elements: PromptElement[];
};

export const promptCategories: PromptCategory[] = [
  {
    id: 'subject',
    title: '主体要素',
    elements: [
      { id: 's1', name: '猫', en: 'cat', emoji: '🐱' },
      { id: 's2', name: '狗', en: 'dog', emoji: '🐕' },
      { id: 's3', name: '男孩', en: 'boy', emoji: '👦' },
      { id: 's4', name: '女孩', en: 'girl', emoji: '👧' },
      { id: 's5', name: '建筑', en: 'building', emoji: '🏠' },
      { id: 's6', name: '机器人', en: 'robot', emoji: '🤖' },
      { id: 's7', name: '汽车', en: 'car', emoji: '🚗' },
      { id: 's8', name: '太空人', en: 'astronaut', emoji: '👨‍🚀' },
    ]
  },
  {
    id: 'environment',
    title: '环境场景',
    elements: [
      { id: 'e1', name: '森林', en: 'in a forest', emoji: '🌲' },
      { id: 'e2', name: '海滩', en: 'on a beach', emoji: '🏖️' },
      { id: 'e3', name: '城市街道', en: 'on a city street', emoji: '🏙️' },
      { id: 'e4', name: '太空', en: 'in outer space', emoji: '🌌' },
      { id: 'e5', name: '赛博朋克城市', en: 'in a cyberpunk city', emoji: '🌆' },
      { id: 'e6', name: '日落时分', en: 'at sunset', emoji: '🌅' },
      { id: 'e7', name: '星空下', en: 'under starry night', emoji: '🌃' },
      { id: 'e8', name: '雪山', en: 'on a snowy mountain', emoji: '🏔️' },
    ]
  },
  {
    id: 'style',
    title: '艺术风格',
    elements: [
      { id: 'st1', name: '水彩画', en: 'watercolor painting style', emoji: '🎨' },
      { id: 'st2', name: '油画', en: 'oil painting style', emoji: '🖼️' },
      { id: 'st3', name: '极简素描', en: 'minimalist sketch style', emoji: '✏️' },
      { id: 'st4', name: '真实摄影', en: 'realistic photography', emoji: '📷' },
      { id: 'st5', name: '3D渲染', en: '3D render, octane render', emoji: '🧊' },
      { id: 'st6', name: '日系动漫', en: 'japanese anime style', emoji: '🌸' },
      { id: 'st7', name: '复古像素', en: 'retro pixel art style', emoji: '👾' },
      { id: 'st8', name: '童话插画', en: 'fairy tale illustration style', emoji: '📖' },
    ]
  },
  {
    id: 'lighting',
    title: '光影渲染',
    elements: [
      { id: 'l1', name: '明亮自然光', en: 'bright natural lighting', emoji: '☀️' },
      { id: 'l2', name: '柔和光线', en: 'soft lighting', emoji: '☁️' },
      { id: 'l3', name: '电影级光影', en: 'cinematic lighting', emoji: '🎬' },
      { id: 'l4', name: '赛博霓虹', en: 'neon lighting', emoji: '🚥' },
      { id: 'l5', name: '暖色调', en: 'warm color palette', emoji: '🔥' },
      { id: 'l6', name: '冷色调', en: 'cold color palette', emoji: '❄️' },
      { id: 'l7', name: '轮廓光', en: 'rim lighting', emoji: '👤' },
      { id: 'l8', name: '丁达尔效应', en: 'Tyndall effect, volumetric lighting', emoji: '✨' },
    ]
  },
  {
    id: 'composition',
    title: '镜头构图',
    elements: [
      { id: 'c1', name: '特写镜头', en: 'close up shot', emoji: '🔍' },
      { id: 'c2', name: '远景', en: 'wide angle shot', emoji: '🔭' },
      { id: 'c3', name: '俯视角度', en: 'top down view', emoji: '🚁' },
      { id: 'c4', name: '仰视角度', en: 'low angle shot', emoji: '🐜' },
      { id: 'c5', name: '对称构图', en: 'symmetrical composition', emoji: '⚖️' },
      { id: 'c6', name: '微距摄影', en: 'macro photography', emoji: '🔬' },
      { id: 'c7', name: '全景', en: 'panoramic view', emoji: '🖼️' },
      { id: 'c8', name: '景深模糊', en: 'depth of field, blurred background', emoji: '🌫️' },
    ]
  }
];
