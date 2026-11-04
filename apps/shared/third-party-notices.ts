import {readFileSync} from 'node:fs';
import type {Plugin} from 'vite';

export function thirdPartyNotices():Plugin{
  return {name:'reprokit-third-party-notices',generateBundle(){
    // Upstream rrweb omits its license text from npm; CSS/font imports are not in Vite's JS notices.
    for(const name of ['rrweb','ibm-plex-sans','ibm-plex-mono'])this.emitFile({type:'asset',fileName:`licenses/${name}.txt`,source:readFileSync(new URL(`./licenses/${name}.txt`,import.meta.url),'utf8')});
  }};
}
