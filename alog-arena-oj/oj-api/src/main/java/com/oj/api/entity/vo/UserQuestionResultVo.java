package com.oj.api.entity.vo;


import com.fasterxml.jackson.annotation.JsonIgnore;
import com.oj.api.entity.UserExeResult;
import lombok.Data;

import java.util.List;

@Data
public class UserQuestionResultVo {

    //是够通过标识
    private Integer pass; // 0  未通过  1 通过

    private String exeMessage; //异常信息 //异常信息

    private List<UserExeResult> userExeResultList;

    @JsonIgnore
    private Integer score;
}
