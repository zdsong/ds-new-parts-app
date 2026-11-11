
import { useState, useCallback } from 'react';
import { useNotify, useTranslate } from 'react-admin';
import { customApiCall } from './dataProvider';
import { useLoadingService } from '../layout/LoadingService';
import { useNavigate } from 'react-router';

// APIレスポンスのインターフェース定義
interface Response {
  code: number;
  message: string;
  [key: string]: any;
}

// フックが提供する機能のインターフェース
interface ApiRequestHook {
  request: (type: string, url: string, options?: any, queryParams?: any, loadingShow?: boolean, notifyShow?: boolean) => Promise<Response>;
  response?: Response;
}

/**
 * APIリクエストを管理するカスタムReactフック
 * 各種HTTPメソッド（GET、POST、PUT、DELETE）をサポート
 */
const useApiRequest = (): ApiRequestHook => {
    
  // レスポンス状態を管理するState
  const [response, setResponse] = useState<Response>({
    code: 0,
    message: ''
  });

  // React-Adminの通知機能を使用
  const notify = useNotify();

  const navigate = useNavigate();

  const translate = useTranslate();

  // ローディングサービスを使用
  const loadingService = useLoadingService();
  
  /**
   * APIリクエストを実行する関数
   * @param type - HTTPメソッド（'get'、'post'、'put'、'delete'）
   * @param url - リクエストURL
   * @param options - リクエストオプション（任意）
   * @returns Promise<Response> - APIレスポンス
   */
  const request = useCallback(async (type: string, url: string, options = {}, queryParams = {}, loadingShow = true, notifyShow = true) => {

    // ローディング表示を開始
    loadingShow ? loadingService.show(): '';

    try {
      let apiResponse: Response;

      // HTTPメソッドに基づいて適切なAPI呼び出しを実行 
      switch (type) {
        case 'get':
          apiResponse = await customApiCall.get(url, options, queryParams, notifyShow);
          break;
        case 'post':
          apiResponse = await customApiCall.post(url, options, queryParams, notifyShow);
          break;
        case 'put':
          apiResponse = await customApiCall.put(url, options, queryParams, notifyShow);
          break;
        case 'delete':
          apiResponse = await customApiCall.delete(url, options, notifyShow);
          break;
        default:
          // サポートされていないメソッドの場合、エラーをスロー
          throw new Error(`サポートされていない要求タイプ: ${type}`);
      }
      if(!apiResponse){return apiResponse;}

      if (apiResponse.code === undefined) {
        return apiResponse;
      }

      // レスポンス状態を更新
      setResponse(apiResponse);

      if(!apiResponse){
        notifyShow ? notify(translate('ra.message.connection_failed'), { type: 'error' }) : '';
      }else if (apiResponse.code >= 200 && apiResponse.code < 300) {
        // GET以外のリクエストで、成功レスポンスの場合、成功通知を表示
        if(type !== 'get' && notifyShow && apiResponse.message){
            notify(apiResponse.message, { type: 'success' });
          } 
      }else {
        // エラーレレスポンスの場合、エラー通知を表示
        if(apiResponse.code === 403){
          navigate('/403')
        }
        if(apiResponse.message){
          notify(apiResponse.message, { type: 'error' });
        }
        
      }
      return apiResponse;
    } catch (error) {
      // エラー発生時の処理
      const errorMessage = error instanceof Error ? error.message : '要求に失敗しました';
      notify(errorMessage, { type: 'error' });
      throw error;
    } finally {
        // ローディング表示を終了（常に実行）
        loadingShow? loadingService.hide(): '';
    }
  }, [notify, loadingService]);

  // フックの戻り値
  return { request, response };
};

export default useApiRequest;
