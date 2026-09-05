package com.oj.common.enums;


import lombok.Getter;

@Getter
public enum UserIdentify {

    ORDINARY (1,"普通用户"),

    ADMIN (2,"管理员用户")
    ;

    private Integer value;

    private String des;


    UserIdentify(int value, String des) {
        this.value = value;
        this.des = des;
    }
}
