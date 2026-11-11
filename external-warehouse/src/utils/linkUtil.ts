export const setCredentialsAndAutoFills = (username: any, password: any) => {
    const message = {
        type: 'SET_CREDENTIALS_FROM_REACT',
        action: 'setCredentialsAndAutoFills', // 新しいアクションタイプを使用する
        credentials: {
            username: username,
            password: password,
            autoFillEnabled: true,
            autoSubmit: true
        }
    };

    // コンテンツスクリプトにメッセージを送信
    window.postMessage(message, '*');

    // 応答を聞く
    const handleResponse = (event: any) => {
        if (event.source !== window) return;

        if (event.data.type === 'CREDENTIALS_RESPONSE') {
            if (event.data.success) {
                console.log('✅ アカウントとパスワードが保存されました。テストが自動的に実行されています...');
            } else {
                console.error('❌ 操作に失敗しました：', event.data.message);
            }
            window.removeEventListener('message', handleResponse);
        }
    };

    window.addEventListener('message', handleResponse);
};

export const customerLinkShow = (permissions: Array<string>) => {
    if(permissions.find(item => {return (item === "*:*:*" || item === 'crm:mastCustomer') })) return true;
    return false
}

export const farmerPasswordShow = (permissions: Array<string>) => {
    if(permissions.find(item => {return  (item === '*:*:*' || item === 'crm:bssAsk:password') })) return true;
    return false
}