import React from 'react';
import {registerRoot,Composition} from 'remotion';
import {Reel} from './reel';
import preview from '../public/preview.json';
const Root=()=> <Composition id="BodyForge" component={Reel} width={1080} height={1920} fps={30} durationInFrames={2250} defaultProps={preview} calculateMetadata={({props})=>({width:props.width,height:props.height,fps:props.fps,durationInFrames:props.durationInFrames})}/>;
registerRoot(Root);
