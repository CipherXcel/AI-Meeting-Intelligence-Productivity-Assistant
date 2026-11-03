declare module "page-flip" {
  export class PageFlip {
    constructor(
      element: HTMLElement,
      settings: Record<string, number | string | boolean>,
    );
    on(event: string, callback: (event: { data: number }) => void): PageFlip;
    loadFromHTML(pages: HTMLElement[]): void;
    flipNext(corner?: string): void;
    flipPrev(corner?: string): void;
    turnToPage(index: number): void;
    destroy(): void;
    clear(): void;
    getRender(): { stop(): void };
  }
}
