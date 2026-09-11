package com.oj.common.entity;

import lombok.Data;

@Data
public class LoginUser {

    private String nickName; //昵称

    private Integer identity;  //identity 1 表示普通用户   2 表示管理员用户

}
