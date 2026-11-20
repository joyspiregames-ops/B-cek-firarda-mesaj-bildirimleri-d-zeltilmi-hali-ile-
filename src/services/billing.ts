export const PRODUCTS = ['kirinti_1', 'kirinti_2', 'kirinti_3'];

// Mağazadan gelen fiyatlar (ekranda bunları gösterin, $ fiyatı koda yazmayın)
export async function getProducts(): Promise<{ id: string; price: string }[]> {
  return [];
}

// Butona basınca bunu çağırın
export async function buy(_id: string): Promise<void> {}

// Satın alma onaylanınca kırıntıyı burada verin (buton tıklanınca değil)
export function onPurchased(_cb: (id: string) => void): (() => void) | void {}
