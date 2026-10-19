export const highlightColors=['gold','orange','sage','none'] as const;
export type HighlightColor=typeof highlightColors[number];
export type Annotation={id:string;chapterId:string;reference:string;translation:'web'|'kjv';verseStart:number;verseEnd:number;excerpt:string;color:HighlightColor;comment:string;pending?:boolean};
export function annotationRange(first:number,last:number){return {verseStart:Math.min(first,last),verseEnd:Math.max(first,last)};}
export function validAnnotation(value:Omit<Annotation,'id'>){return /^[A-Z0-9]{3}\.\d{1,3}$/.test(value.chapterId)&&value.reference.length<=100&&['web','kjv'].includes(value.translation)&&Number.isInteger(value.verseStart)&&Number.isInteger(value.verseEnd)&&value.verseStart>=1&&value.verseEnd>=value.verseStart&&value.verseEnd<=176&&value.excerpt.length>0&&value.excerpt.length<=1200&&highlightColors.includes(value.color)&&value.comment.length<=3000&&(value.color!=='none'||!!value.comment.trim());}
