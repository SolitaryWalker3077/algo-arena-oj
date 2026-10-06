package com.oj.friend.entity.user.vo;

import lombok.Data;

import java.util.List;

@Data
public class UserQuestionResultVo {
    //是够通过标识
    private Integer result; // 0  未通过  1 通过

    private String errorMsg; //异常信息

    private List<UserExeResult> userExeResultList;
}
