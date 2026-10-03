package com.oj.friend.entity.question.dto;


import com.oj.common.entity.PageQueryDto;
import lombok.Data;

@Data
public class QuestionQueryDto extends PageQueryDto {

    private String keyword;

    private Integer difficult;
}
