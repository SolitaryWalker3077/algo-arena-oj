package com.oj.common.enums;

public enum UserStatus {

    Block (0), //拉黑状态

    Normal(1), //正常状态
    ;

    private Integer value;

    UserStatus(Integer value) {
        this.value = value;
    }

    public Integer getValue() {
        return value;
    }
}
