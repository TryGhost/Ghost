import type {CardMenuItem} from './buildCardMenu';

type KoenigCardMenu = CardMenuItem | CardMenuItem[];

export interface KoenigCardNodeClass {
    kgMenu?: KoenigCardMenu;
    uploadType?: string;
}

export interface KoenigCardMenuNodeClass extends KoenigCardNodeClass {
    kgMenu: KoenigCardMenu;
}

export function getKoenigCardNodeClass(nodeClass: unknown): KoenigCardNodeClass {
    return nodeClass as KoenigCardNodeClass;
}

export function hasKoenigCardMenu(nodeClass: KoenigCardNodeClass): nodeClass is KoenigCardMenuNodeClass {
    return Boolean(nodeClass.kgMenu);
}
