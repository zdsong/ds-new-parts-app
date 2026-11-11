import React, { useState, useEffect } from 'react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import { buttonSx, formSx } from '../styles/commonSX';
import FormTicket from '../compontent/FormTicket';
import { useNavigate, useParams } from 'react-router';
import useApiRequest from '../adapters/apiUtil';

interface SearchFormProps {
    onSubmit?: (data: any) => void;
}

// ユーザー詳細インタフェースの定義
interface UserDetail {
    userId: string; // ユーザID
    password: string; // パスワード
    userName: string; // ユーザ名
    nickName: string;
    status: string; // 権限
    statusLabel: string; // 利用状態
    roleLabel: string;
    roleId: string;
}

const C014: React.FC<SearchFormProps> = () => {
    const { request } = useApiRequest();
    const { cd  } = useParams<{ cd : string }>(); 
    const navigate = useNavigate();

    // ユーザー詳細データの初期化
    const [cardData, setCardData] = useState<UserDetail>({
        userId: '',
        password: '',
        userName: '',
        nickName: '',
        status: '',
        statusLabel: '',
        roleLabel: '',
        roleId: ''
    });

    // ページ・ロード/ルーティング・パラメータの変更時にデータを要求する
    useEffect(() => {
        if (cd ) {
            fetchUserData(cd );
        }
    }, [cd , request]);

    const fetchUserData = async (userId: string) => {
        const response = await request('get', `api/system/user/info/${userId}`);
        setCardData(response?.data || {});
    };

    const navigateC015 = (id: string) => {
       navigate(`/C013/C015/${id}`);
    };

    return (
        <PageContainer title={'ユーザ情報詳細'}>
            <CustomCard sx={{width: '100%'}} titleVariant={'body1'} title="ユーザ情報">
                <div style={formSx.form2 as React.CSSProperties}>
                    <FormTicket 
                        label = {'ユーザID'}
                        value = {cardData.userName}
                    ></FormTicket>
                    <FormTicket
                        label = {'パスワード'}
                        type = {'password'}
                        value = {cardData.password}
                    ></FormTicket>
                    <FormTicket
                        label = {'ユーザ名'}
                        value = {cardData.nickName}
                    ></FormTicket>
                    <div></div>
                    <FormTicket
                        label = {'権限'}
                        value = {cardData.roleLabel}
                    ></FormTicket>
                    <FormTicket
                        label = {'利用状態'}
                        value = {cardData.statusLabel}
                    ></FormTicket>
                </div>
            </CustomCard>
            <div style={buttonSx.buttonBar}>
                <button 
                    style={buttonSx.button}  
                    onClick={()=>{navigate(-1)}}
                >
                    戻る
                </button>
                <button 
                    style={buttonSx.button}  
                    onClick={()=>{navigateC015(cardData.userId)}}
                >
                    編集
                </button>
            </div>
        </PageContainer>
    );
};

export default C014;