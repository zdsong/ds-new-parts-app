export type ComponentKey = 
  | 'C002' | 'C003' | 'C005' | 'C007' | 'C010' | 'C013' | 'C016' ;

export interface BackendRoute {
  name: string,
  path: string,
  compontent: string,
  hidden: boolean,
  meta: any
}

export interface BackendRouteMeta {
    icon: any,
    link: any,
    noCache: boolean,
    title: string
}

export interface BackendRouteResponse {
  code: number;
  message: string;
  data: BackendRoute[];
}